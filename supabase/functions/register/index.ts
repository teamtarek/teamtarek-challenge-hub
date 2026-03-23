import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REGISTER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, password, displayName, token } = await req.json();

    if (!email || !password || !displayName) {
      return new Response(
        JSON.stringify({ error: "E-Mail, Passwort und Name sind erforderlich." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Passwort muss mindestens 6 Zeichen haben." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let membershipSource = "";
    let stripeCustomerId: string | null = null;
    let stripeSubscriptionId: string | null = null;

    // PATH 1: Token-based registration
    if (token) {
      logStep("Validating invite token", { token });

      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("invite_tokens")
        .select("*")
        .eq("token", token)
        .is("used_by_user_id", null)
        .maybeSingle();

      if (tokenError || !tokenData) {
        logStep("Invalid token", { error: tokenError?.message });
        return new Response(
          JSON.stringify({ error: "Ungültiger oder bereits verwendeter Einladungscode." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      // Check expiration
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        logStep("Token expired", { expires_at: tokenData.expires_at });
        return new Response(
          JSON.stringify({ error: "Dieser Einladungscode ist abgelaufen." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      membershipSource = "token";
      logStep("Token validated successfully");
    }
    // PATH 2: Stripe-based registration
    else {
      logStep("Checking Stripe signup authorization", { email });

      const { data: authData, error: authError } = await supabaseAdmin
        .from("signup_authorizations")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (authError || !authData) {
        logStep("No signup authorization found", { error: authError?.message });
        return new Response(
          JSON.stringify({ error: "Registrierung nur mit Einladung oder nach Stripe-Zahlung möglich." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      // Check expiration
      if (authData.expires_at && new Date(authData.expires_at) < new Date()) {
        logStep("Authorization expired", { expires_at: authData.expires_at });
        return new Response(
          JSON.stringify({ error: "Deine Registrierungsberechtigung ist abgelaufen. Bitte starte den Checkout erneut." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      stripeCustomerId = authData.stripe_customer_id;
      stripeSubscriptionId = authData.stripe_subscription_id;
      membershipSource = "stripe";
      logStep("Stripe authorization validated");
    }

    // Create user via admin API (bypasses disabled signup)
    // email_confirm: false means user must confirm via email link
    logStep("Creating user account", { email, displayName });
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: false,
      user_metadata: {
        display_name: displayName,
        invite_token: token || undefined,
      },
    });

    if (createError) {
      logStep("ERROR creating user", { error: createError.message });
      if (createError.message.includes("already been registered") || createError.message.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "Diese E-Mail-Adresse ist bereits registriert." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }
      return new Response(
        JSON.stringify({ error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const userId = newUser.user.id;
    logStep("User created successfully", { userId });

    // Mark token or authorization as used
    if (token) {
      await supabaseAdmin
        .from("invite_tokens")
        .update({
          used_by_user_id: userId,
          used_at: new Date().toISOString(),
        })
        .eq("token", token);
      logStep("Token marked as used");
    } else {
      await supabaseAdmin
        .from("signup_authorizations")
        .update({
          used: true,
          used_by_user_id: userId,
        })
        .eq("email", email.toLowerCase().trim())
        .eq("used", false);
      logStep("Signup authorization marked as used");
    }

    // Create membership
    const { error: membershipError } = await supabaseAdmin
      .from("memberships")
      .insert({
        user_id: userId,
        source: membershipSource,
        status: "active",
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        last_activity_at: new Date().toISOString(),
      });

    if (membershipError) {
      logStep("WARNING: membership creation failed", { error: membershipError.message });
    } else {
      logStep("Membership created", { source: membershipSource });
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        display_name: displayName,
      });

    if (profileError) {
      logStep("WARNING: profile creation failed", { error: profileError.message });
    } else {
      logStep("Profile created");
    }

    // Automatically assign founding member status for token-based registrations (first 20)
    if (membershipSource === "token") {
      const { data: foundingResult, error: foundingError } = await supabaseAdmin
        .rpc("try_assign_founding_member", { _user_id: userId });

      if (foundingError) {
        logStep("WARNING: founding member check failed", { error: foundingError.message });
      } else if (foundingResult) {
        logStep("Founding member status assigned");
      } else {
        logStep("Founding member limit reached, not assigned");
      }
    }

    // Assign default 'user' role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "user",
      });

    if (roleError) {
      logStep("WARNING: role assignment failed", { error: roleError.message });
    }

    // Check for existing registrations with matching display name (for merge notification)
    logStep("Checking for name matches in existing registrations", { displayName });
    const { data: matchingRegs, error: matchError } = await supabaseAdmin
      .from("registrations")
      .select("id, participant_name, challenge_id, email")
      .ilike("participant_name", displayName.trim())
      .is("user_id", null);

    if (!matchError && matchingRegs && matchingRegs.length > 0) {
      logStep("Found matching registrations", { count: matchingRegs.length });
      
      // Get challenge names for better notification context
      const challengeIds = [...new Set(matchingRegs.map(r => r.challenge_id))];
      const { data: challengeData } = await supabaseAdmin
        .from("challenges")
        .select("id, name")
        .in("id", challengeIds);
      
      const challengeMap = new Map((challengeData || []).map(c => [c.id, c.name]));
      
      await supabaseAdmin.from("admin_notifications").insert({
        type: "merge_candidate",
        data: {
          new_user_id: userId,
          new_user_name: displayName,
          new_user_email: email,
          matching_registrations: matchingRegs.map(r => ({
            id: r.id,
            name: r.participant_name,
            challenge_id: r.challenge_id,
            challenge_name: challengeMap.get(r.challenge_id) || "Unbekannt",
            email: r.email,
          })),
        },
      });
      logStep("Merge notification created for admin");
    }

    logStep("Registration complete", { userId, source: membershipSource });

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in register", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
