 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import Stripe from "https://esm.sh/stripe@18.5.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
 };
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
   console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
     const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
     
     if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
     if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
 
     const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
     const signature = req.headers.get("stripe-signature");
     if (!signature) throw new Error("No stripe-signature header");
 
     const body = await req.text();
     let event: Stripe.Event;
 
     try {
       event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
     } catch (err) {
       logStep("Webhook signature verification failed", { error: err.message });
       return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 400,
       });
     }
 
     logStep("Received event", { type: event.type });
 
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
       { auth: { persistSession: false } }
     );
 
     if (event.type === "checkout.session.completed") {
       const session = event.data.object as Stripe.Checkout.Session;
       const customerEmail = session.customer_email || session.customer_details?.email;
       const customerId = session.customer as string;
       const subscriptionId = session.subscription as string;
 
       logStep("Checkout completed", { customerEmail, customerId, subscriptionId });
 
       if (!customerEmail) {
         logStep("No customer email found");
         return new Response(JSON.stringify({ received: true }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
 
       // Get subscription details
       const subscription = await stripe.subscriptions.retrieve(subscriptionId);
       const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
 
       // Find user by email
       const { data: userData } = await supabase.auth.admin.listUsers();
       const user = userData?.users?.find((u) => u.email === customerEmail);
 
       if (user) {
         logStep("Found user, creating/updating membership", { userId: user.id });
 
         const { error: membershipError } = await supabase
           .from("memberships")
           .upsert({
             user_id: user.id,
             source: "stripe",
             status: "active",
             stripe_customer_id: customerId,
             stripe_subscription_id: subscriptionId,
             current_period_end: currentPeriodEnd,
             last_activity_at: new Date().toISOString(),
           }, { onConflict: "user_id" });
 
         if (membershipError) {
           logStep("Error upserting membership", { error: membershipError });
         } else {
           logStep("Membership created/updated successfully");
         }
       } else {
         logStep("User not found for email", { customerEmail });
       }
     }
 
     if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
       const subscription = event.data.object as Stripe.Subscription;
       const customerId = subscription.customer as string;
 
       logStep("Subscription event", { type: event.type, customerId, status: subscription.status });
 
       // Get customer email
       const customer = await stripe.customers.retrieve(customerId);
       if (customer.deleted) {
         logStep("Customer was deleted");
         return new Response(JSON.stringify({ received: true }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
 
       const customerEmail = customer.email;
       if (!customerEmail) {
         logStep("No customer email found");
         return new Response(JSON.stringify({ received: true }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
 
       // Find user
       const { data: userData } = await supabase.auth.admin.listUsers();
       const user = userData?.users?.find((u) => u.email === customerEmail);
 
       if (user) {
         let status: string;
         switch (subscription.status) {
           case "active":
           case "trialing":
             status = "active";
             break;
           case "past_due":
             status = "past_due";
             break;
           case "canceled":
           case "unpaid":
           case "incomplete_expired":
             status = "canceled";
             break;
           default:
             status = "inactive";
         }
 
         const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
 
         const { error: updateError } = await supabase
           .from("memberships")
           .update({
             status,
             current_period_end: currentPeriodEnd,
           })
           .eq("user_id", user.id);
 
         if (updateError) {
           logStep("Error updating membership", { error: updateError });
         } else {
           logStep("Membership updated", { status });
         }
       }
     }
 
     return new Response(JSON.stringify({ received: true }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     logStep("ERROR", { message: error.message });
     return new Response(JSON.stringify({ error: error.message }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
       status: 500,
     });
   }
 });