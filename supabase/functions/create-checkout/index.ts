import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Monthly membership price ID
const MONTHLY_MEMBERSHIP_PRICE_ID = "price_1SxNuIK28r8kgD4TqIfP4xMS";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify Stripe key is configured
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    logStep("Stripe key verified");

    // Try to get authenticated user (optional)
    let userId: string | undefined;
    let userEmail: string | undefined;

    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      logStep("Authorization header found, attempting to get user");
      
      // Create Supabase client with user's auth context
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      // Try to get authenticated user
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      
      if (!userError && userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email;
        logStep("User authenticated", { userId, email: userEmail });
      } else {
        logStep("No authenticated user found, proceeding without user context", { error: userError?.message });
      }
    } else {
      logStep("No authorization header, proceeding without user context");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer already exists for this user (only if we have an email)
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ 
        email: userEmail, 
        limit: 1 
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      } else {
        logStep("No existing Stripe customer found, will create during checkout");
      }
    }

    // Get the origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://teamtarek-challenge-hub.lovable.app";

    // Build session metadata
    const metadata: Record<string, string> = {};
    if (userId) {
      metadata.user_id = userId;
    }

    // Determine success URL based on whether user is authenticated
    const successUrl = userId
      ? `${origin}/profil?checkout=success`
      : `${origin}/auth?tab=signup&checkout=success`;

    // Create a subscription checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: MONTHLY_MEMBERSHIP_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: `${origin}/?checkout=canceled`,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      priceId: MONTHLY_MEMBERSHIP_PRICE_ID,
      url: session.url,
      hasUserId: !!userId
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
