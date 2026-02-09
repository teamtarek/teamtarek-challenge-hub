import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user with their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete user data in order (respecting foreign keys)
    await adminClient.from("likes").delete().eq("user_id", user.id);
    await adminClient.from("notifications").delete().eq("user_id", user.id);
    await adminClient.from("notifications").delete().eq("actor_id", user.id);
    await adminClient.from("comments").delete().eq("user_id", user.id);
    await adminClient.from("posts").delete().eq("user_id", user.id);
    await adminClient.from("founding_crew_posts").delete().eq("user_id", user.id);
    await adminClient.from("user_session_progress").delete().eq("user_id", user.id);
    await adminClient.from("user_starter_journey").delete().eq("user_id", user.id);
    await adminClient.from("user_roles").delete().eq("user_id", user.id);
    await adminClient.from("memberships").delete().eq("user_id", user.id);
    await adminClient.from("registrations").update({ user_id: null }).eq("user_id", user.id);
    await adminClient.from("profiles").delete().eq("user_id", user.id);

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Konto konnte nicht gelöscht werden" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Interner Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
