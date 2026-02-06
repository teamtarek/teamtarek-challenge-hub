import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: "thread_reply" | "comment_reply";
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor_name: string | null;
  post_title: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch actor names and post titles
    const actorIds = [...new Set(data.map((n: any) => n.actor_id))];
    const postIds = [...new Set(data.map((n: any) => n.post_id).filter(Boolean))];

    const [profilesRes, postsRes] = await Promise.all([
      actorIds.length > 0
        ? supabase.from("profiles").select("user_id, display_name").in("user_id", actorIds)
        : { data: [] },
      postIds.length > 0
        ? supabase.from("posts").select("id, title").in("id", postIds)
        : { data: [] },
    ]);

    const profileMap: Record<string, string | null> = {};
    (profilesRes.data || []).forEach((p: any) => {
      profileMap[p.user_id] = p.display_name;
    });

    const postMap: Record<string, string> = {};
    (postsRes.data || []).forEach((p: any) => {
      postMap[p.id] = p.title;
    });

    const enriched: Notification[] = data.map((n: any) => ({
      ...n,
      actor_name: profileMap[n.actor_id] || "Jemand",
      post_title: n.post_id ? postMap[n.post_id] || "einem Thread" : null,
    }));

    setNotifications(enriched);
    setUnreadCount(enriched.filter((n) => !n.is_read).length);
    setLoading(false);
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .eq("id", notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
};
