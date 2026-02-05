 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@18.5.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
   console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
 };
 
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    
    // SECURITY: Require authentication for checkout
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logStep("Unauthorized - no auth header");
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      logStep("Unauthorized - invalid token", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userEmail = userData.user.email;
    const userId = userData.user.id;
    let customerId: string | undefined;
    
    logStep("Authenticated user", { email: userEmail, userId });
 
     const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
     if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
 
     const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
 
     // Check for existing customer
     if (userEmail) {
       const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
       if (customers.data.length > 0) {
         customerId = customers.data[0].id;
         logStep("Found existing customer", { customerId });
       }
     }
 
     const origin = req.headers.get("origin") || "https://id-preview--397aa8f5-08a0-4c58-b3d7-9175b4dec0f8.lovable.app";
 
     const session = await stripe.checkout.sessions.create({
       customer: customerId,
       customer_email: customerId ? undefined : userEmail || undefined,
       line_items: [
         {
           price: "price_1SxNuIK28r8kgD4TqIfP4xMS",
           quantity: 1,
         },
       ],
       mode: "subscription",
       success_url: `${origin}/auth?subscription=success`,
       cancel_url: `${origin}/auth?subscription=canceled`,
       allow_promotion_codes: true,
     });
 
     logStep("Checkout session created", { sessionId: session.id });
 
     return new Response(JSON.stringify({ url: session.url }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
       status: 200,
     });
   } catch (error) {
     logStep("ERROR", { message: error.message });
     return new Response(JSON.stringify({ error: error.message }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
       status: 500,
     });
   }
 });