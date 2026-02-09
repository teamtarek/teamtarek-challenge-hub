import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // If webhook secret is configured, verify signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logStep("Webhook signature verification failed", { error: errorMessage });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Parse event without signature verification (for testing)
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification (no secret configured)");
    }

    logStep("Event type received", { type: event.type });

    // Only handle checkout.session.completed events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { 
        sessionId: session.id,
        customerId: session.customer,
        customerEmail: session.customer_email,
        subscriptionId: session.subscription,
        metadata: session.metadata
      });

      // Create Supabase client with service role for admin operations
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Get customer email from session or fetch from Stripe customer
      let customerEmail = session.customer_email;
      let customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

      if (!customerEmail && customerId) {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          customerEmail = customer.email;
        }
        logStep("Fetched customer email from Stripe", { email: customerEmail });
      }

      if (!customerEmail) {
        logStep("ERROR: No customer email found");
        return new Response(JSON.stringify({ error: "No customer email found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Find user by email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) {
        logStep("ERROR fetching users", { error: userError.message });
        throw userError;
      }

      const user = userData.users.find(u => u.email === customerEmail);
      // Get subscription ID early so it's available for both paths
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription?.id;

      if (!user) {
        logStep("No user found for email, creating signup authorization", { email: customerEmail });
        
        // Create signup authorization so the user can register after payment
        const { error: authInsertError } = await supabaseAdmin
          .from("signup_authorizations")
          .insert({
            email: customerEmail.toLowerCase().trim(),
            stripe_customer_id: customerId || null,
            stripe_subscription_id: subscriptionId || null,
          });

        if (authInsertError) {
          logStep("WARNING: Failed to create signup authorization", { error: authInsertError.message });
        } else {
          logStep("Signup authorization created for email", { email: customerEmail });
        }

        return new Response(JSON.stringify({ received: true, authorization_created: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Found user", { userId: user.id, email: user.email });

      // Get subscription details for period end
      let currentPeriodEnd: string | null = null;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        logStep("Subscription details", { 
          subscriptionId, 
          currentPeriodEnd,
          status: subscription.status 
        });
      }

      // Upsert membership record
      const { error: membershipError } = await supabaseAdmin
        .from("memberships")
        .upsert({
          user_id: user.id,
          source: "stripe",
          status: "active",
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscriptionId || null,
          current_period_end: currentPeriodEnd,
          last_activity_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (membershipError) {
        logStep("ERROR upserting membership", { error: membershipError.message });
        throw membershipError;
      }

      logStep("Membership activated successfully", { userId: user.id });

      return new Response(JSON.stringify({ received: true, activated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle subscription updates (for renewals and cancellations)
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id;

      logStep("Subscription event", { 
        type: event.type,
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status 
      });

      // Create Supabase client with service role
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Find membership by stripe_customer_id
      const { data: membership, error: findError } = await supabaseAdmin
        .from("memberships")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (findError || !membership) {
        logStep("Membership not found for customer", { customerId });
        return new Response(JSON.stringify({ received: true, warning: "Membership not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Update membership status based on subscription status
      const newStatus = subscription.status === "active" ? "active" : "inactive";
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

      const { error: updateError } = await supabaseAdmin
        .from("memberships")
        .update({
          status: newStatus,
          current_period_end: currentPeriodEnd,
          last_activity_at: new Date().toISOString(),
        })
        .eq("user_id", membership.user_id);

      if (updateError) {
        logStep("ERROR updating membership", { error: updateError.message });
        throw updateError;
      }

      logStep("Membership updated", { userId: membership.user_id, status: newStatus });

      return new Response(JSON.stringify({ received: true, updated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Return success for unhandled events
    logStep("Event type not handled, acknowledging", { type: event.type });
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
