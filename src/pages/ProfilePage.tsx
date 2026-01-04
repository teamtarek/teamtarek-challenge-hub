import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, ArrowLeft, Loader2, User, Trophy, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

interface Registration {
  id: string;
  score: number;
  created_at: string;
  challenges: {
    name: string;
    slug: string;
    start_date: string;
  };
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
      }

      // Fetch registrations with challenge info
      const { data: regData } = await supabase
        .from("registrations")
        .select(`
          id,
          score,
          created_at,
          challenges (
            name,
            slug,
            start_date
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (regData) {
        setRegistrations(regData as unknown as Registration[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", user.id);
    setSaving(false);

    if (error) {
      toast.error("Profil konnte nicht gespeichert werden.");
      return;
    }

    toast.success("Profil gespeichert!");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Dumbbell className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold tracking-tight">Team Tarek</span>
            </Link>
            <Button variant="outline" onClick={handleSignOut}>
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zu den Challenges
        </Link>

        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          Mein Profil
        </h1>

        {/* Profile Form */}
        <div className="challenge-card mb-8">
          <h2 className="text-xl font-semibold mb-4">Profil bearbeiten</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Anzeigename</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="Dein Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-minimal"
              />
            </div>
            
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="input-minimal opacity-50"
              />
              <p className="text-xs text-muted-foreground">E-Mail kann nicht geändert werden</p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </form>
        </div>

        {/* My Challenges */}
        <div className="challenge-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Meine Challenges
          </h2>
          
          {registrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Du hast dich noch für keine Challenge registriert.</p>
              <Link to="/" className="text-primary hover:underline mt-2 inline-block">
                Challenges entdecken →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg) => (
                <Link
                  key={reg.id}
                  to={`/challenge/${reg.challenges.slug}`}
                  className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <div>
                    <p className="font-medium">{reg.challenges.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(reg.challenges.start_date).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-primary font-semibold font-mono">{reg.score}</span>
                    <span className="text-muted-foreground text-sm ml-1">Punkte</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
