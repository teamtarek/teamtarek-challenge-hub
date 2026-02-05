import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MemberBadge } from "@/components/MemberBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, User, Trophy, Calendar, Lock } from "lucide-react";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  age_class: string | null;
  favorite_exercise: string | null;
  hated_exercise: string | null;
  is_private: boolean;
}

interface Registration {
  id: string;
  score: number | null;
  is_verified: boolean | null;
  year: number | null;
  kettlebell_weight_kg: number | null;
  total_reps: number | null;
  total_time_seconds: number | null;
  challenges: {
    name: string;
    slug: string;
  };
}

type MemberType = "webmaster" | "admin" | "member" | "prospect";

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<Registration[]>([]);
  const [memberType, setMemberType] = useState<MemberType>("prospect");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, age_class, favorite_exercise, hated_exercise, is_private")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch member type
      const { data: memberTypeData } = await supabase
        .rpc("get_user_member_type", { _user_id: userId });
      
      if (memberTypeData) {
        setMemberType(memberTypeData as MemberType);
      }

      // Fetch completed challenges using secure public view (excludes email)
      const { data: regData } = await supabase
        .from("registrations_public" as any)
        .select(`
          id,
          score,
          is_verified,
          year,
          kettlebell_weight_kg,
          total_reps,
          total_time_seconds,
          challenge_id
        `)
        .eq("user_id", userId)
        .eq("is_verified", true)
        .order("year", { ascending: false });

      // Fetch challenge details separately since we can't join on views
      if (regData && regData.length > 0) {
        const challengeIds = [...new Set(regData.map((r: any) => r.challenge_id))];
        const { data: challengesData } = await supabase
          .from("challenges")
          .select("id, name, slug")
          .in("id", challengeIds);
        
        if (challengesData) {
          const challengeMap = challengesData.reduce((acc: any, c: any) => {
            acc[c.id] = { name: c.name, slug: c.slug };
            return acc;
          }, {});
          
          const regWithChallenges = regData.map((r: any) => ({
            ...r,
            challenges: challengeMap[r.challenge_id] || { name: "Unknown", slug: "" }
          }));
          
          // Filter to only those with actual results
          const completed = regWithChallenges.filter((reg: any) => 
            (reg.score && reg.score > 0) || 
            (reg.total_reps && reg.total_reps > 0) || 
            (reg.kettlebell_weight_kg && reg.kettlebell_weight_kg > 0)
          );
          setCompletedChallenges(completed as unknown as Registration[]);
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.slice(0, 2).toUpperCase();
    }
    return "?";
  };

  const formatResult = (reg: Registration): string => {
    const slug = reg.challenges.slug;
    
    if (slug === "5-minute-snatch-test" && reg.total_reps) {
      return `${reg.total_reps} Reps`;
    }
    if ((slug === "simple-sinister" || slug === "rite-of-passage") && reg.kettlebell_weight_kg) {
      const time = reg.total_time_seconds || reg.score;
      if (time) {
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        return `${reg.kettlebell_weight_kg}kg in ${mins}:${secs.toString().padStart(2, "0")}`;
      }
      return `${reg.kettlebell_weight_kg}kg`;
    }
    if (reg.score && reg.score > 0) {
      const hours = Math.floor(reg.score / 3600);
      const mins = Math.floor((reg.score % 3600) / 60);
      const secs = reg.score % 60;
      if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      }
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return "-";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-8 max-w-2xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Profil nicht gefunden</h1>
            <p className="text-muted-foreground">Dieses Profil existiert nicht oder ist nicht öffentlich.</p>
          </div>
        </div>
      </div>
    );
  }

  // If profile is private, show limited info
  if (profile.is_private) {
    return (
      <div className="min-h-screen">
        <Header />

        <div className="container py-8 max-w-2xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>

          {/* Profile Header - Limited for private profiles */}
          <div className="challenge-card mb-8">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={profile.avatar_url || undefined} alt="Avatar" />
                <AvatarFallback className="bg-secondary text-xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{profile.display_name || "Unbekannt"}</h1>
                  <MemberBadge memberType={memberType} size="lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Private Profile Notice */}
          <div className="challenge-card text-center py-12">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Privates Profil</h2>
            <p className="text-muted-foreground">
              Dieses Mitglied hat sein Profil auf privat gestellt.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container py-8 max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>

        {/* Profile Header */}
        <div className="challenge-card mb-8">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24 border-2 border-border">
              <AvatarImage src={profile.avatar_url || undefined} alt="Avatar" />
              <AvatarFallback className="bg-secondary text-xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{profile.display_name || "Unbekannt"}</h1>
                <MemberBadge memberType={memberType} size="lg" />
              </div>
              {profile.age_class && (
                <p className="text-muted-foreground">Altersklasse: {profile.age_class}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {profile.favorite_exercise && (
                  <span>❤️ {profile.favorite_exercise}</span>
                )}
                {profile.hated_exercise && (
                  <span>💔 {profile.hated_exercise}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="challenge-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Achievements
          </h2>
          
          {completedChallenges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Noch keine abgeschlossenen Challenges.</p>
            </div>
          ) : (
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
                      {reg.year}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-primary font-semibold font-mono text-lg">
                      {formatResult(reg)}
                    </span>
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

export default PublicProfilePage;