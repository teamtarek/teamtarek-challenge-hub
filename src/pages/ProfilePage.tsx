import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, User, Trophy, Calendar, Camera } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  favorite_exercise: string | null;
  hated_exercise: string | null;
}

interface Registration {
  id: string;
  score: number | null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [favoriteExercise, setFavoriteExercise] = useState("");
  const [hatedExercise, setHatedExercise] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
        .select("display_name, avatar_url, age, favorite_exercise, hated_exercise")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
        setAge(profileData.age?.toString() || "");
        setFavoriteExercise(profileData.favorite_exercise || "");
        setHatedExercise(profileData.hated_exercise || "");
        setAvatarUrl(profileData.avatar_url);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei aus.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Das Bild darf maximal 5MB groß sein.");
      return;
    }

    setUploadingAvatar(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Avatar konnte nicht hochgeladen werden.");
      setUploadingAvatar(false);
      return;
    }

    // Get public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`;

    // Update profile with avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);

    if (updateError) {
      toast.error("Profil konnte nicht aktualisiert werden.");
    } else {
      setAvatarUrl(publicUrl + "?t=" + Date.now()); // Add timestamp to bust cache
      toast.success("Avatar hochgeladen!");
    }

    setUploadingAvatar(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        display_name: displayName.trim() || null,
        age: age ? parseInt(age, 10) : null,
        favorite_exercise: favoriteExercise.trim() || null,
        hated_exercise: hatedExercise.trim() || null,
      })
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

  const getInitials = () => {
    if (displayName) {
      return displayName.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "?";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter registrations with scores > 0
  const completedChallenges = registrations.filter((reg) => reg.score && reg.score > 0);

  return (
    <div className="min-h-screen">
      <Header />

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
          
          {/* Avatar Section */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                <AvatarFallback className="bg-secondary text-xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium">{displayName || user?.email}</p>
              <p className="text-sm text-muted-foreground">
                Klicke auf das Kamera-Symbol, um ein Profilbild hochzuladen
              </p>
            </div>
          </div>

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
              <Label htmlFor="age">Alter</Label>
              <Input
                id="age"
                type="number"
                min="1"
                max="120"
                placeholder="Dein Alter"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input-minimal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="favorite-exercise">Lieblingsübung</Label>
              <Input
                id="favorite-exercise"
                type="text"
                placeholder="z.B. Kniebeugen, Bankdrücken..."
                value={favoriteExercise}
                onChange={(e) => setFavoriteExercise(e.target.value)}
                className="input-minimal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hated-exercise">Hassübung</Label>
              <Input
                id="hated-exercise"
                type="text"
                placeholder="z.B. Burpees, Planks..."
                value={hatedExercise}
                onChange={(e) => setHatedExercise(e.target.value)}
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

            <div className="flex gap-3">
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
              <Button type="button" variant="outline" onClick={handleSignOut}>
                Abmelden
              </Button>
            </div>
          </form>
        </div>

        {/* My Results */}
        {completedChallenges.length > 0 && (
          <div className="challenge-card mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Meine Ergebnisse
            </h2>
            <div className="space-y-3">
              {completedChallenges.map((reg) => (
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
                    <span className="text-primary font-semibold font-mono text-xl">{reg.score}</span>
                    <span className="text-muted-foreground text-sm ml-1">Punkte</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* My Challenges */}
        <div className="challenge-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Meine Anmeldungen
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
                    {reg.score && reg.score > 0 ? (
                      <>
                        <span className="text-primary font-semibold font-mono">{reg.score}</span>
                        <span className="text-muted-foreground text-sm ml-1">Punkte</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">Ausstehend</span>
                    )}
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
