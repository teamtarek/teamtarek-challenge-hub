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

    // Verify the caller
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { post_id, comment_content } = await req.json();
    if (!post_id || !comment_content) {
      return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get the post and its owner
    const { data: post } = await adminClient
      .from("posts")
      .select("user_id, title")
      .eq("id", post_id)
      .single();

    if (!post) {
      return new Response(JSON.stringify({ error: "Post nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't notify if the commenter is the post owner
    if (post.user_id === caller.id) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the post owner's email
    const { data: ownerAuth } = await adminClient.auth.admin.getUserById(post.user_id);
    if (!ownerAuth?.user?.email) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get commenter's display name
    const { data: commenterProfile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", caller.id)
      .single();

    const commenterName = commenterProfile?.display_name || "Jemand";
    const postTitle = post.title || "einem Beitrag";
    const previewText = comment_content.length > 100 
      ? comment_content.substring(0, 100) + "..." 
      : comment_content;

    // Send email using Supabase Auth's built-in email (via admin API)
    // We use the inbuilt SMTP to send a simple notification
    const siteUrl = Deno.env.get("SITE_URL") || "https://teamtarek-challenge-hub.lovable.app";
    const postUrl = `${siteUrl}/community/${post_id}`;

    // Use Resend or fallback - for MVP, we'll use a simple fetch to the Supabase auth email endpoint
    // Since we don't have a dedicated email service, we create a notification record
    // The notification is already created by the DB trigger, so this is supplementary
    
    // For MVP: Log the notification attempt. In production, integrate with an email service.
    console.log(`[NOTIFICATION] Email to ${ownerAuth.user.email}: ${commenterName} hat auf "${postTitle}" geantwortet.`);
    console.log(`[NOTIFICATION] Preview: ${previewText}`);
    console.log(`[NOTIFICATION] Link: ${postUrl}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: "Interner Fehler" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
