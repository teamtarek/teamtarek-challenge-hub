 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 const logStep = (step: string, details?: any) => {
   const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
   console.log(`[DEACTIVATE-INACTIVE] ${step}${detailsStr}`);
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     logStep("Function started");
 
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
       { auth: { persistSession: false } }
     );
 
     // Call the database function to deactivate inactive memberships
     const { data, error } = await supabase.rpc("deactivate_inactive_memberships");
 
     if (error) {
       logStep("Error deactivating memberships", { error });
       throw error;
     }
 
     logStep("Deactivated memberships", { count: data });
 
     return new Response(JSON.stringify({ deactivated: data }), {
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