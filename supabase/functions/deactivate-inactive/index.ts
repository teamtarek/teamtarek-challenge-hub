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

    // SECURITY: Require authentication and admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logStep("Unauthorized - no auth header");
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Use anon key client to verify the user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      logStep("Unauthorized - invalid token");
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await anonClient.rpc("is_admin_or_webmaster", { 
      _user_id: userData.user.id 
    });

    if (!isAdmin) {
      logStep("Forbidden - user is not admin", { userId: userData.user.id });
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Admin authenticated", { userId: userData.user.id });

    // Use service role for the actual operation
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