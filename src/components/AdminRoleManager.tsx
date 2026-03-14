import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2, Search, Crown, Shield, Dumbbell, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoleUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role_id: string;
  role: string;
  is_founding_member: boolean;
}

interface UserSearchResult {
  user_id: string;
  email: string;
  display_name: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; className: string }> = {
  webmaster: { label: "Webmaster", icon: Crown, className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  admin: { label: "Admin", icon: Shield, className: "bg-red-500/20 text-red-400 border-red-500/30" },
  coach: { label: "Coach", icon: Dumbbell, className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export const AdminRoleManager = () => {
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [togglingFounder, setTogglingFounder] = useState<string | null>(null);

  const fetchRoleUsers = async () => {
    setLoading(true);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .in("role", ["admin", "coach"]);

    if (roleError || !roleData) {
      setLoading(false);
      return;
    }

    if (roleData.length === 0) {
      setRoleUsers([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(roleData.map((r) => r.user_id))];
    
    const [{ data: profileData }, { data: registrationData }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, is_founding_member").in("user_id", userIds),
      supabase.from("registrations").select("user_id, email").in("user_id", userIds),
    ]);

    const userList: RoleUser[] = roleData.map((role) => {
      const profile = profileData?.find((p) => p.user_id === role.user_id);
      const registration = registrationData?.find((r) => r.user_id === role.user_id);
      return {
        user_id: role.user_id,
        email: registration?.email || "Unbekannt",
        display_name: profile?.display_name || null,
        role_id: role.id,
        role: role.role,
        is_founding_member: profile?.is_founding_member ?? false,
      };
    });

    setRoleUsers(userList);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoleUsers();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

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

    const uniqueUsers = new Map<string, UserSearchResult>();

    for (const reg of registrationData) {
      if (reg.user_id && !uniqueUsers.has(reg.user_id)) {
        const alreadyHasRole = roleUsers.some(
          (a) => a.user_id === reg.user_id && a.role === selectedRole
        );
        if (!alreadyHasRole) {
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
  }, [searchQuery, roleUsers, selectedRole]);

  const handleAddRole = async (userId: string) => {
    setAdding(userId);

    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: selectedRole as "admin" | "coach",
    });

    if (error) {
      toast.error(`Fehler beim Hinzufügen der Rolle`);
      console.error(error);
    } else {
      toast.success(`${ROLE_CONFIG[selectedRole]?.label || selectedRole} erfolgreich hinzugefügt`);
      setSearchQuery("");
      setSearchResults([]);
      await fetchRoleUsers();
    }

    setAdding(null);
  };

  const handleRemoveRole = async (roleId: string, userName: string, role: string) => {
    if (!confirm(`Möchtest du ${userName} wirklich als ${ROLE_CONFIG[role]?.label || role} entfernen?`)) {
      return;
    }

    setRemoving(roleId);

    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);

    if (error) {
      toast.error("Fehler beim Entfernen der Rolle");
      console.error(error);
    } else {
      toast.success("Rolle erfolgreich entfernt");
      await fetchRoleUsers();
    }

    setRemoving(null);
  };

  const handleToggleFoundingMember = async (userId: string, currentStatus: boolean) => {
    setTogglingFounder(userId);

    const { error } = await supabase
      .from("profiles")
      .update({ is_founding_member: !currentStatus })
      .eq("user_id", userId);

    if (error) {
      toast.error("Fehler beim Aktualisieren des Founding-Member-Status");
      console.error(error);
    } else {
      toast.success(
        !currentStatus ? "Als Founding Member markiert" : "Founding-Member-Status entfernt"
      );
      await fetchRoleUsers();
    }

    setTogglingFounder(null);
  };

  // Group by role for display
  const admins = roleUsers.filter((u) => u.role === "admin");
  const coaches = roleUsers.filter((u) => u.role === "coach");

  const renderUserRow = (user: RoleUser) => {
    const config = ROLE_CONFIG[user.role];
    const Icon = config?.icon || Shield;

    return (
      <div
        key={user.role_id}
        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{user.display_name || "Unbenannt"}</span>
              <Badge variant="outline" className={config?.className}>
                {config?.label || user.role}
              </Badge>
              {user.is_founding_member && (
                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <Award className="w-3 h-3 mr-1" />
                  Founding Member
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleFoundingMember(user.user_id, user.is_founding_member)}
            disabled={togglingFounder === user.user_id}
            title={user.is_founding_member ? "Founding Member entfernen" : "Als Founding Member markieren"}
          >
            {togglingFounder === user.user_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Award className={`w-4 h-4 ${user.is_founding_member ? "text-amber-400" : "text-muted-foreground"}`} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveRole(user.role_id, user.display_name || user.email, user.role)}
            disabled={removing === user.role_id}
            className="text-destructive hover:text-destructive"
          >
            {removing === user.role_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Rollen-Verwaltung</h2>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Rolle zuweisen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rolle zuweisen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rolle</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                        <p className="font-medium">{user.display_name || "Unbenannt"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddRole(user.user_id)}
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
      ) : roleUsers.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Noch keine Rollen zugewiesen
        </p>
      ) : (
        <div className="space-y-6">
          {admins.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Admins ({admins.length})
              </h3>
              <div className="space-y-2">{admins.map(renderUserRow)}</div>
            </div>
          )}
          {coaches.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Coaches ({coaches.length})
              </h3>
              <div className="space-y-2">{coaches.map(renderUserRow)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
