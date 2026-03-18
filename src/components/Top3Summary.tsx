import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Dumbbell, Zap } from "lucide-react";
import { getLevelClassName } from "@/lib/mileLevels";

interface Challenge {
  id: string;
  name: string;
  slug: string;
  category: string;
}

interface TopEntry {
  id: string;
  participant_name: string;
  user_id: string | null;
  avatar_url: string | null;
  score: number;
  total_time_seconds: number | null;
  total_reps: number | null;
  kettlebell_weight_kg: number | null;
}

const formatTime = (seconds: number | null): string => {
  if (seconds === null || seconds === 0) return "--:--";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Trophy className="w-4 h-4 text-yellow-500" />;
    case 2: return <Medal className="w-4 h-4 text-gray-400" />;
    case 3: return <Award className="w-4 h-4 text-amber-600" />;
    default: return null;
  }
};

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

// Determine the primary result display for a challenge
const getResultDisplay = (slug: string, entry: TopEntry) => {
  const timeBasedSlugs = ["the-mile", "5-kilometer-run", "10-kilometer-run", "spring-challenge-2026", "10-rounds-of-pain", "the-quadrant", "meet-betty"];
  const repBasedSlugs = ["5-minute-snatch-test", "secret-service-snatch-test", "kettlebell-swing"];
  const roundBasedSlugs = ["1234-complex", "rite-of-passage"];
  const levelBasedSlugs = ["simple-sinister"];

  if (timeBasedSlugs.includes(slug)) {
    return formatTime(entry.total_time_seconds);
  }
  if (repBasedSlugs.includes(slug)) {
    return `${entry.total_reps || "-"} Reps`;
  }
  if (roundBasedSlugs.includes(slug)) {
    return `${entry.total_reps || "-"} Runden`;
  }
  if (levelBasedSlugs.includes(slug)) {
    return entry.score ? `Level ${entry.score}` : "-";
  }
  // Murph and others: time from score
  return formatTime(entry.score);
};

// Sort entries based on challenge type
const sortEntries = (slug: string, entries: TopEntry[]) => {
  const timeSortedSlugs = ["the-mile", "5-kilometer-run", "10-kilometer-run", "spring-challenge-2026", "meet-betty"];

  if (timeSortedSlugs.includes(slug)) {
    return [...entries].sort((a, b) => (a.total_time_seconds || Infinity) - (b.total_time_seconds || Infinity));
  }
  if (slug === "10-rounds-of-pain" || slug === "the-quadrant") {
    return [...entries].sort((a, b) => {
      const timeDiff = (a.total_time_seconds || Infinity) - (b.total_time_seconds || Infinity);
      if (timeDiff !== 0) return timeDiff;
      return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
    });
  }
  if (slug === "1234-complex" || slug === "rite-of-passage") {
    return [...entries].sort((a, b) => {
      const roundsDiff = (b.total_reps || 0) - (a.total_reps || 0);
      if (roundsDiff !== 0) return roundsDiff;
      const timeDiff = (a.total_time_seconds || Infinity) - (b.total_time_seconds || Infinity);
      if (timeDiff !== 0) return timeDiff;
      return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
    });
  }
  if (slug === "5-minute-snatch-test" || slug === "secret-service-snatch-test") {
    return [...entries].sort((a, b) => (b.total_reps || 0) - (a.total_reps || 0));
  }
  if (slug === "kettlebell-swing") {
    return [...entries].sort((a, b) => {
      const passDiff = (b.score || 0) - (a.score || 0);
      if (passDiff !== 0) return passDiff;
      return (b.total_reps || 0) - (a.total_reps || 0);
    });
  }
  if (slug === "simple-sinister") {
    return [...entries].sort((a, b) => {
      const levelDiff = (b.score || 0) - (a.score || 0);
      if (levelDiff !== 0) return levelDiff;
      return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
    });
  }
  // Default: lower score = better (time-based like Murph)
  return [...entries].sort((a, b) => (a.score || 0) - (b.score || 0));
};

const hasResult = (slug: string, entry: TopEntry) => {
  const timeSlugs = ["the-mile", "5-kilometer-run", "10-kilometer-run", "spring-challenge-2026", "10-rounds-of-pain", "the-quadrant", "meet-betty"];
  const repSlugs = ["5-minute-snatch-test", "secret-service-snatch-test", "kettlebell-swing"];
  const roundSlugs = ["1234-complex"];
  const passFail = ["1234-strength-challenge"];

  if (passFail.includes(slug)) return entry.score !== null && entry.score !== undefined;
  if (timeSlugs.includes(slug)) return entry.total_time_seconds && entry.total_time_seconds > 0;
  if (repSlugs.includes(slug)) return entry.total_reps && entry.total_reps > 0;
  if (roundSlugs.includes(slug)) return entry.total_reps && entry.total_reps > 0;
  if (slug === "rite-of-passage") return (entry.total_reps && entry.total_reps > 0) || (entry.score && entry.score > 0);
  if (slug === "simple-sinister") return entry.score && entry.score > 0;
  return entry.score && entry.score > 0;
};

export const Top3Summary = () => {
  const [challengeData, setChallengeData] = useState<{ challenge: Challenge; top3: TopEntry[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch all challenges
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, name, slug, category")
        .order("start_date", { ascending: false });

      if (!challenges || challenges.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch all verified registrations
      const { data: registrations } = await supabase
        .from("registrations")
        .select("id, participant_name, user_id, score, total_time_seconds, total_reps, kettlebell_weight_kg, challenge_id, is_verified")
        .eq("is_verified", true);

      if (!registrations) {
        setLoading(false);
        return;
      }

      // Get user avatars
      const userIds = [...new Set(registrations.filter(r => r.user_id).map(r => r.user_id as string))];
      let avatarMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, avatar_url")
          .in("user_id", userIds);
        if (profiles) {
          avatarMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.avatar_url;
            return acc;
          }, {} as Record<string, string | null>);
        }
      }

      // Group by challenge and get top 3
      const result = challenges
        .map((ch) => {
          const chRegs = registrations
            .filter((r) => r.challenge_id === ch.id)
            .map((r) => ({
              id: r.id,
              participant_name: r.participant_name,
              user_id: r.user_id,
              avatar_url: r.user_id ? avatarMap[r.user_id] || null : null,
              score: r.score ?? 0,
              total_time_seconds: r.total_time_seconds,
              total_reps: r.total_reps,
              kettlebell_weight_kg: r.kettlebell_weight_kg,
            }));

          const withResults = chRegs.filter((e) => hasResult(ch.slug, e));
          const sorted = sortEntries(ch.slug, withResults);
          return { challenge: ch, top3: sorted.slice(0, 3) };
        })
        .filter((item) => item.top3.length > 0);

      setChallengeData(result);
      setLoading(false);
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 bg-card animate-pulse rounded-lg border border-border" />
        ))}
      </div>
    );
  }

  if (challengeData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Noch keine verifizierten Ergebnisse vorhanden.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {challengeData.map(({ challenge, top3 }) => (
        <Link key={challenge.id} to={`/challenge/${challenge.slug}`} className="bg-card border border-border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
          <h3 className="font-semibold text-sm text-foreground truncate">{challenge.name}</h3>
          <div className="space-y-2">
            {top3.map((entry, idx) => (
              <div key={entry.id} className="flex items-center gap-2.5">
                <div className="w-5 flex justify-center flex-shrink-0">
                  {getRankIcon(idx + 1)}
                </div>
                {entry.user_id ? (
                  <Link to={`/profil/${entry.user_id}`}>
                    <Avatar className="w-7 h-7 border border-border hover:ring-2 hover:ring-primary transition-all">
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-[10px]">
                        {getInitials(entry.participant_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <Avatar className="w-7 h-7 border border-border">
                    <AvatarFallback className="bg-muted text-[10px]">
                      {getInitials(entry.participant_name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm truncate flex-1">
                  {entry.user_id ? (
                    <Link to={`/profil/${entry.user_id}`} className="hover:text-primary transition-colors">
                      {entry.participant_name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{entry.participant_name}</span>
                  )}
                </span>
                <span className="text-xs font-mono text-primary font-semibold whitespace-nowrap">
                  {getResultDisplay(challenge.slug, entry)}
                </span>
                {entry.score >= 1 && entry.score <= 4 && (challenge.slug === "simple-sinister" || challenge.slug === "rite-of-passage" || challenge.slug === "meet-betty") && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getLevelClassName(entry.score)}`}>
                    L{entry.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
};
