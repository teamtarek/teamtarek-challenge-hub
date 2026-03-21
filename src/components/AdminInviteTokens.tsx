import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Loader2, Copy, Check, Trash2, User, Clock } from "lucide-react";

interface InviteToken {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_by_user_id: string | null;
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "–";
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const AdminInviteTokens = () => {
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState("7");

  const fetchTokens = async () => {
    const { data, error } = await supabase
      .from("invite_tokens")
      .select("id, token, created_at, expires_at, used_at, used_by_user_id")
      .order("created_at", { ascending: false });

    if (!error && data) setTokens(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
    const expires_at = expiryDays
      ? new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString()
      : null;

    const { error } = await supabase.from("invite_tokens").insert({
      token,
      created_by: user.id,
      expires_at,
    });

    if (error) {
      toast.error("Fehler beim Erstellen des Tokens");
    } else {
      toast.success("Token erstellt");
      await fetchTokens();
    }
    setCreating(false);
  };

  const handleCopy = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(id);
    toast.success("Token kopiert");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Token wirklich löschen?")) return;
    const { error } = await supabase
      .from("invite_tokens")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Token gelöscht");
      await fetchTokens();
    }
  };

  const unusedTokens = tokens.filter((t) => !t.used_at);
  const usedTokens = tokens.filter((t) => t.used_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <h3 className="text-lg font-semibold text-foreground">Einladungs-Tokens</h3>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-2">
            <Label htmlFor="expiryDays" className="text-sm text-muted-foreground whitespace-nowrap">
              Gültig für
            </Label>
            <Input
              id="expiryDays"
              type="number"
              min="1"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">Tage</span>
          </div>
          <Button onClick={handleCreate} disabled={creating} size="sm">
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Token erstellen
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unused Tokens */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Aktive Tokens ({unusedTokens.length})
            </h4>
            {unusedTokens.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic">
                Keine aktiven Tokens vorhanden.
              </p>
            ) : (
              <div className="space-y-2">
                {unusedTokens.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-medium text-foreground">
                        {t.token}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Erstellt: {formatDate(t.created_at)}
                        </span>
                        {t.expires_at && (
                          <span>
                            Läuft ab: {formatDate(t.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(t.token, t.id)}
                      >
                        {copiedId === t.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Used Tokens */}
          {usedTokens.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Verwendete Tokens ({usedTokens.length})
              </h4>
              <div className="space-y-2">
                {usedTokens.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 opacity-60"
                  >
                    <div className="space-y-1">
                      <p className="font-mono text-sm text-muted-foreground line-through">
                        {t.token}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Verwendet: {formatDate(t.used_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminInviteTokens;
