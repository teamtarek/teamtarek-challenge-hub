import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, AGE_CLASSES } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MemberBadge } from "@/components/MemberBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, User, Trophy, Calendar, Camera, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  age_class: string | null;
  gender: string | null;
  weight_class: string | null;
  favorite_exercise: string | null;
  hated_exercise: string | null;
  is_private: boolean;
}

interface Registration {
  id: string;
  score: number | null;
  is_verified: boolean | null;
  year: number | null;
  created_at: string;
  total_reps: number | null;
  kettlebell_weight_kg: number | null;
  total_time_seconds: number | null;
  murph_version: string | null;
  challenges: {
    name: string;
    slug: string;
    start_date: string;
  };
}

const GENDER_OPTIONS = [
  { value: "male", label: "Männlich" },
  { value: "female", label: "Weiblich" },
  { value: "other", label: "Dazwischen/Außerhalb" },
];

const WEIGHT_CLASSES_MALE = [
  { value: "male_light", label: "Leichtgewicht (<75kg)" },
  { value: "male_medium", label: "Mittelgewicht (75-90kg)" },
  { value: "male_heavy", label: "Schwergewicht (90kg+)" },
];

const WEIGHT_CLASSES_FEMALE = [
  { value: "female_light", label: "Leichtgewicht (<60kg)" },
  { value: "female_medium", label: "Mittelgewicht (60-75kg)" },
  { value: "female_heavy", label: "Schwergewicht (75kg+)" },
];

// Helper function to format time from seconds
const formatTimeFromSeconds = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Helper function to format result based on challenge type
const formatChallengeResult = (reg: Registration): { value: string; label: string } => {
  const slug = reg.challenges.slug?.toLowerCase() || "";
  
  // Murph - Zeit und Version (score ist in Sekunden)
  if (slug.includes("murph")) {
    const parts: string[] = [];
    if (reg.score && reg.score > 0) {
      parts.push(formatTimeFromSeconds(reg.score));
    }
    if (reg.murph_version && reg.murph_version !== "Standard") {
      parts.push(reg.murph_version);
    }
    return { value: parts.length > 0 ? parts.join(" • ") : "-", label: reg.murph_version === "Standard" ? "Standard" : "" };
  }
  
  // Rite of Passage - Gewicht und Zeit
  if (slug === "rite-of-passage") {
    const parts: string[] = [];
    if (reg.kettlebell_weight_kg && reg.kettlebell_weight_kg > 0) {
      parts.push(`${reg.kettlebell_weight_kg} kg`);
    }
    if (reg.total_time_seconds && reg.total_time_seconds > 0) {
      parts.push(formatTimeFromSeconds(reg.total_time_seconds));
    }
    return { value: parts.length > 0 ? parts.join(" • ") : "-", label: "" };
  }
  
  // Simple & Sinister - Zeit und Gewicht
  if (slug === "simple-sinister") {
    const parts: string[] = [];
    if (reg.score && reg.score > 0) {
      parts.push(formatTimeFromSeconds(reg.score));
    }
    if (reg.kettlebell_weight_kg && reg.kettlebell_weight_kg > 0) {
      parts.push(`${reg.kettlebell_weight_kg} kg`);
    }
    return { value: parts.length > 0 ? parts.join(" • ") : "-", label: "" };
  }
  
  // 5-Minute Snatch Test - Reps und Gewicht
  if (slug === "5-minute-snatch-test") {
    const parts: string[] = [];
    if (reg.total_reps && reg.total_reps > 0) {
      parts.push(`${reg.total_reps} Reps`);
    }
    if (reg.kettlebell_weight_kg && reg.kettlebell_weight_kg > 0) {
      parts.push(`${reg.kettlebell_weight_kg} kg`);
    }
    return { value: parts.length > 0 ? parts.join(" • ") : "-", label: "" };
  }
  
  // Standard - Punkte
  if (reg.score && reg.score > 0) {
    return { value: reg.score.toString(), label: "Punkte" };
  }
  
  return { value: "-", label: "" };
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { memberType, loading: roleLoading } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [ageClass, setAgeClass] = useState("");
  const [gender, setGender] = useState("");
  const [weightClass, setWeightClass] = useState("");
  const [favoriteExercise, setFavoriteExercise] = useState("");
  const [hatedExercise, setHatedExercise] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
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
        .select("display_name, avatar_url, age, age_class, gender, weight_class, favorite_exercise, hated_exercise, is_private")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
        setDisplayName(profileData.display_name || "");
        setAge(profileData.age?.toString() || "");
        setAgeClass(profileData.age_class || "");
        setGender(profileData.gender || "");
        setWeightClass(profileData.weight_class || "");
        setFavoriteExercise(profileData.favorite_exercise || "");
        setHatedExercise(profileData.hated_exercise || "");
        setIsPrivate(profileData.is_private || false);
        setAvatarUrl(profileData.avatar_url);
      }

      // Fetch registrations with challenge info
      const { data: regData } = await supabase
        .from("registrations")
        .select(`
          id,
          score,
          is_verified,
          year,
          created_at,
          total_reps,
          kettlebell_weight_kg,
          total_time_seconds,
          murph_version,
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
        age_class: ageClass || null,
        gender: gender || null,
        weight_class: weightClass || null,
        favorite_exercise: favoriteExercise.trim() || null,
        hated_exercise: hatedExercise.trim() || null,
        is_private: isPrivate,
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

  // Filter registrations with verified results (score, total_reps, kettlebell_weight_kg, or total_time_seconds > 0)
  const completedChallenges = registrations.filter((reg) => 
    reg.is_verified && (
      (reg.score && reg.score > 0) || 
      (reg.total_reps && reg.total_reps > 0) || 
      (reg.kettlebell_weight_kg && reg.kettlebell_weight_kg > 0) ||
      (reg.total_time_seconds && reg.total_time_seconds > 0)
    )
  );
  // Get current registrations (not yet completed)
  const pendingRegistrations = registrations.filter((reg) => 
    !reg.is_verified || (
      (!reg.score || reg.score === 0) && 
      (!reg.total_reps || reg.total_reps === 0) && 
      (!reg.kettlebell_weight_kg || reg.kettlebell_weight_kg === 0) &&
      (!reg.total_time_seconds || reg.total_time_seconds === 0)
    )
  );

  // Get weight class options based on gender
  const getWeightClassOptions = () => {
    if (gender === "male") return WEIGHT_CLASSES_MALE;
    if (gender === "female") return WEIGHT_CLASSES_FEMALE;
    return [...WEIGHT_CLASSES_MALE, ...WEIGHT_CLASSES_FEMALE];
  };

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

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            Mein Profil
          </h1>
          {!roleLoading && memberType && (
            <MemberBadge memberType={memberType} size="lg" />
          )}
        </div>

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
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium">{displayName || user?.email}</p>
              </div>
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
              <Label htmlFor="age-class">Altersklasse</Label>
              <Select value={ageClass} onValueChange={setAgeClass}>
                <SelectTrigger className="input-minimal">
                  <SelectValue placeholder="Altersklasse wählen" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_CLASSES.map((ac) => (
                    <SelectItem key={ac.value} value={ac.value}>
                      {ac.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Geschlecht</Label>
              <Select value={gender} onValueChange={(val) => {
                setGender(val);
                // Reset weight class if gender changes
                if (val !== gender) setWeightClass("");
              }}>
                <SelectTrigger className="input-minimal">
                  <SelectValue placeholder="Geschlecht wählen (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight-class">Gewichtsklasse</Label>
              <Select value={weightClass} onValueChange={setWeightClass}>
                <SelectTrigger className="input-minimal">
                  <SelectValue placeholder="Gewichtsklasse wählen (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {getWeightClassOptions().map((wc) => (
                    <SelectItem key={wc.value} value={wc.value}>
                      {wc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Privacy Toggle */}
            <div className="p-4 rounded-lg border border-border bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isPrivate ? (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Globe className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <Label htmlFor="privacy-toggle" className="font-medium cursor-pointer">
                      Profil-Sichtbarkeit
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {isPrivate 
                        ? "Dein Profil ist privat. Andere können nur deinen Namen sehen." 
                        : "Dein Profil ist öffentlich. Andere können deine Achievements sehen."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="privacy-toggle"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPrivate ? "bg-muted" : "bg-primary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPrivate ? "translate-x-1" : "translate-x-6"
                    }`}
                  />
                </button>
              </div>
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

        {/* Achievements - Completed Challenges with Results */}
        {completedChallenges.length > 0 && (
          <div className="challenge-card mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Achievements
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
                      {reg.year || new Date(reg.challenges.start_date).getFullYear()}
                    </div>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const result = formatChallengeResult(reg);
                      return (
                        <>
                          <span className="text-primary font-semibold font-mono text-lg">{result.value}</span>
                          {result.label && <span className="text-muted-foreground text-sm ml-1">{result.label}</span>}
                        </>
                      );
                    })()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Current Registrations */}
        <div className="challenge-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Aktuelle Anmeldungen
          </h2>
          
          {pendingRegistrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Du hast keine offenen Challenge-Anmeldungen.</p>
              <Link to="/" className="text-primary hover:underline mt-2 inline-block">
                Challenges entdecken →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRegistrations.map((reg) => (
                <Link
                  key={reg.id}
                  to={`/challenge/${reg.challenges.slug}`}
                  className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <div>
                    <p className="font-medium">{reg.challenges.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mt-1">
                      <Calendar className="w-3 h-3" />
                      {reg.year || new Date(reg.challenges.start_date).getFullYear()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground text-sm">Ausstehend</span>
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
