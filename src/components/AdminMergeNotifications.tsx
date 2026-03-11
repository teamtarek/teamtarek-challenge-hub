import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Check, X, Users } from "lucide-react";

interface MergeCandidate {
  id: string;
  type: string;
  data: {
    new_user_id: string;
    new_user_name: string;
    new_user_email: string;
    matching_registrations: {
      id: string;
      name: string;
      challenge_id: string;
      challenge_name: string;
      email: string | null;
    }[];
  };
  is_resolved: boolean;
  created_at: string;
}

export const AdminMergeNotifications = () => {
  const [notifications, setNotifications] = useState<MergeCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("type", "merge_candidate")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data as unknown as MergeCandidate[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMerge = async (notification: MergeCandidate) => {
    setMerging(notification.id);

    // Update all matching registrations to link to the new user
    const regIds = notification.data.matching_registrations.map(r => r.id);
    
    const { error: updateError } = await supabase
      .from("registrations")
      .update({ user_id: notification.data.new_user_id })
      .in("id", regIds);

    if (updateError) {
      toast.error("Fehler beim Zusammenführen der Einträge");
      setMerging(null);
      return;
    }

    // Mark notification as resolved
    await supabase
      .from("admin_notifications")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", notification.id);

    toast.success(`${regIds.length} Einträge mit ${notification.data.new_user_name} verknüpft`);
    await fetchNotifications();
    setMerging(null);
  };

  const handleDismiss = async (notificationId: string) => {
    setDismissing(notificationId);

    await supabase
      .from("admin_notifications")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", notificationId);

    toast.success("Benachrichtigung verworfen");
    await fetchNotifications();
    setDismissing(null);
  };

  if (loading) {
    return null;
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-semibold">Zusammenführungs-Vorschläge</h2>
        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-medium">
          {notifications.length}
        </span>
      </div>
      
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5 space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Neuer User: {notification.data.new_user_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {notification.data.new_user_email} — Registriert am{" "}
                {new Date(notification.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>

          <div className="text-sm">
            <p className="text-muted-foreground mb-2">
              Folgende nicht verknüpfte Einträge stimmen mit dem Namen überein:
            </p>
            <ul className="space-y-1">
              {notification.data.matching_registrations.map((reg) => (
                <li key={reg.id} className="flex items-center gap-2 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="font-medium">{reg.challenge_name}</span>
                  <span className="text-muted-foreground">— {reg.name}</span>
                  {reg.email && !reg.email.includes("@placeholder.local") && (
                    <span className="text-xs text-muted-foreground">({reg.email})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => handleMerge(notification)}
              disabled={merging === notification.id || dismissing === notification.id}
            >
              {merging === notification.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Zusammenführen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDismiss(notification.id)}
              disabled={merging === notification.id || dismissing === notification.id}
            >
              {dismissing === notification.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Verwerfen
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
