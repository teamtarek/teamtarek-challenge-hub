import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Search, Crown, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role_id: string;
}

interface UserSearchResult {
  user_id: string;
  email: string;
  display_name: string | null;
}

export const AdminRoleManager = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchAdmins = async () => {
    setLoading(true);
    
    // Get all admin roles with user info
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .eq("role", "admin");

    if (roleError) {
      console.error("Error fetching roles:", roleError);
      setLoading(false);
      return;
    }

    if (!roleData || roleData.length === 0) {
      setAdmins([]);
      setLoading(false);
      return;
    }

    // Get profiles for these users
    const userIds = roleData.map((r) => r.user_id);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    // Get emails from registrations (since we can't access auth.users)
    const { data: registrationData } = await supabase
      .from("registrations")
      .select("user_id, email")
      .in("user_id", userIds);

    const adminList: AdminUser[] = roleData.map((role) => {
      const profile = profileData?.find((p) => p.user_id === role.user_id);
      const registration = registrationData?.find((r) => r.user_id === role.user_id);
      return {
        user_id: role.user_id,
        email: registration?.email || "Unbekannt",
        display_name: profile?.display_name || null,
        role_id: role.id,
      };
    });

    setAdmins(adminList);
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    // Search in registrations for users matching the query
    const { data: registrationData } = await supabase
      .from("registrations")
      .select("user_id, email, participant_name")
      .or(`email.ilike.%${searchQuery}%,participant_name.ilike.%${searchQuery}%`)
      .not("user_id", "is", null);

    if (!registrationData) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    // Get unique users by user_id
    const uniqueUsers = new Map<string, UserSearchResult>();
    
    for (const reg of registrationData) {
      if (reg.user_id && !uniqueUsers.has(reg.user_id)) {
        // Check if already admin
        const isAlreadyAdmin = admins.some((a) => a.user_id === reg.user_id);
        if (!isAlreadyAdmin) {
          // Get profile if exists
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", reg.user_id)
            .maybeSingle();

          uniqueUsers.set(reg.user_id, {
            user_id: reg.user_id,
            email: reg.email,
            display_name: profile?.display_name || reg.participant_name,
          });
        }
      }
    }

    setSearchResults(Array.from(uniqueUsers.values()));
    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, admins]);

  const handleAddAdmin = async (userId: string) => {
    setAdding(userId);

    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "admin",
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen des Admins");
      console.error(error);
    } else {
      toast.success("Admin erfolgreich hinzugefügt");
      setSearchQuery("");
      setSearchResults([]);
      await fetchAdmins();
    }

    setAdding(null);
  };

  const handleRemoveAdmin = async (roleId: string, userName: string) => {
    if (!confirm(`Möchtest du ${userName} wirklich als Admin entfernen?`)) {
      return;
    }

    setRemoving(roleId);

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);

    if (error) {
      toast.error("Fehler beim Entfernen des Admins");
      console.error(error);
    } else {
      toast.success("Admin erfolgreich entfernt");
      await fetchAdmins();
    }

    setRemoving(null);
  };

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Admin-Verwaltung</h2>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Admin hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Admin hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Benutzer suchen</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Name oder E-Mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {searching ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {user.display_name || "Unbenannt"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddAdmin(user.user_id)}
                        disabled={adding === user.user_id}
                      >
                        {adding === user.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Hinzufügen
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keine Benutzer gefunden
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Gib einen Namen oder E-Mail ein, um Benutzer zu suchen
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : admins.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Noch keine Admins zugewiesen
        </p>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.role_id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-red-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {admin.display_name || "Unbenannt"}
                    </span>
                    <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                      Admin
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleRemoveAdmin(admin.role_id, admin.display_name || admin.email)
                }
                disabled={removing === admin.role_id}
                className="text-destructive hover:text-destructive"
              >
                {removing === admin.role_id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
