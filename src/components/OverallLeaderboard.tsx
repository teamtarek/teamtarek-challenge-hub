import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Star } from "lucide-react";

interface Registration {
  id: string;
  participant_name: string;
  user_id: string | null;
  challenge_id: string;
  score: number;
  total_time_seconds: number | null;
  total_reps: number | null;
  kettlebell_weight_kg: number | null;
  is_verified: boolean;
  murph_version: string | null;
}

interface Challenge {
  id: string;
  name: string;
  slug: string;
  category: string;
}

interface OverallEntry {
  participantKey: string; // user_id or participant_name fallback
  participant_name: string;
  user_id: string | null;
  avatar_url: string | null;
  totalPoints: number;
  challengeBreakdown: { challengeName: string; rank: number; points: number }[];
}

const POINTS_BY_RANK: Record<number, number> = {
  1: 15,
  2: 12,
  3: 10,
  4: 8,
  5: 5,
};
const PARTICIPATION_POINTS = 1;
const PASS_FAIL_POINTS = 10;

// ---- Sorting logic mirrored from Top3Summary / Leaderboard ----

const hasResult = (slug: string, entry: Registration): boolean => {
  const timeSlugs = ["the-mile", "5-kilometer-run", "10-kilometer-run", "spring-challenge-2026", "10-rounds-of-pain", "the-quadrant", "meet-betty", "secret-service-snatch-test"];
  const repSlugs = ["5-minute-snatch-test", "kettlebell-swing"];
  const roundSlugs = ["1234-complex", "the-classic-complex"];

  if (timeSlugs.includes(slug)) return (entry.total_time_seconds ?? 0) > 0;
  if (repSlugs.includes(slug)) return (entry.total_reps ?? 0) > 0;
  if (roundSlugs.includes(slug)) return (entry.total_reps ?? 0) > 0;
  if (slug === "rite-of-passage") return ((entry.total_reps ?? 0) > 0) || ((entry.score ?? 0) > 0);
  if (slug === "simple-sinister") return (entry.score ?? 0) > 0;
  return (entry.score ?? 0) > 0;
};

const sortEntries = (slug: string, entries: Registration[]): Registration[] => {
  const timeSortedSlugs = ["the-mile", "5-kilometer-run", "10-kilometer-run", "spring-challenge-2026", "meet-betty"];
  const isPassFail = slug === "kettlebell-swing";

  if (isPassFail) {
    return [...entries].sort((a, b) => {
      const passDiff = (b.score || 0) - (a.score || 0);
      if (passDiff !== 0) return passDiff;
      return (b.total_reps || 0) - (a.total_reps || 0);
    });
  }
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
  if (slug === "the-classic-complex") {
    return [...entries].sort((a, b) => {
      const roundsDiff = (b.total_reps || 0) - (a.total_reps || 0);
      if (roundsDiff !== 0) return roundsDiff;
      return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
    });
  }
  if (slug === "5-minute-snatch-test" || slug === "secret-service-snatch-test") {
    return [...entries].sort((a, b) => (b.total_reps || 0) - (a.total_reps || 0));
  }
  if (slug === "simple-sinister") {
    return [...entries].sort((a, b) => {
      const levelDiff = (b.score || 0) - (a.score || 0);
      if (levelDiff !== 0) return levelDiff;
      return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
    });
  }
  // Default (Murph etc): lower score = better
  return [...entries].sort((a, b) => (a.score || 0) - (b.score || 0));
};

const isPassFailChallenge = (slug: string) => slug === "kettlebell-swing";

const getPointsForRank = (rank: number, slug: string, entry: Registration): number => {
  if (isPassFailChallenge(slug)) {
    return entry.score === 1 ? PASS_FAIL_POINTS : 0;
  }
  return POINTS_BY_RANK[rank] ?? PARTICIPATION_POINTS;
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2: return <Medal className="w-5 h-5 text-gray-400" />;
    case 3: return <Award className="w-5 h-5 text-amber-600" />;
    default: return <span className="w-5 h-5 text-center font-mono text-muted-foreground">{rank}</span>;
  }
};

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

export const OverallLeaderboard = () => {
  const [entries, setEntries] = useState<OverallEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const compute = async () => {
      // 1) Fetch challenges
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, name, slug, category");

      if (!challenges || challenges.length === 0) { setLoading(false); return; }

      // 2) Fetch all verified registrations
      const { data: registrations } = await supabase
        .from("registrations")
        .select("id, participant_name, user_id, challenge_id, score, total_time_seconds, total_reps, kettlebell_weight_kg, is_verified, murph_version")
        .eq("is_verified", true);

      if (!registrations) { setLoading(false); return; }

      // 3) Avatars
      const userIds = [...new Set(registrations.filter(r => r.user_id).map(r => r.user_id as string))];
      let avatarMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, avatar_url")
          .in("user_id", userIds);
        if (profiles) {
          avatarMap = profiles.reduce((acc, p) => { acc[p.user_id] = p.avatar_url; return acc; }, {} as Record<string, string | null>);
        }
      }

      // 4) For each challenge, rank entries and assign points
      const pointsMap: Record<string, { participant_name: string; user_id: string | null; avatar_url: string | null; totalPoints: number; breakdown: { challengeName: string; rank: number; points: number }[] }> = {};

      for (const ch of challenges) {
        let chRegs = registrations
          .filter(r => r.challenge_id === ch.id)
          .map(r => ({ ...r, score: r.score ?? 0 }));

        // 10 Rounds of Pain: only count entries under 30 minutes
        if (ch.slug === "10-rounds-of-pain") {
          chRegs = chRegs.filter(r => (r.total_time_seconds ?? 0) > 0 && (r.total_time_seconds ?? 0) < 1800);
        }

        const withResults = chRegs.filter(e => hasResult(ch.slug, e));
        const sorted = sortEntries(ch.slug, withResults);

        sorted.forEach((entry, idx) => {
          const rank = idx + 1;
          const points = getPointsForRank(rank, ch.slug, entry);
          if (points <= 0) return;

          const key = entry.user_id || `name:${entry.participant_name}`;
          if (!pointsMap[key]) {
            pointsMap[key] = {
              participant_name: entry.participant_name,
              user_id: entry.user_id,
              avatar_url: entry.user_id ? avatarMap[entry.user_id] || null : null,
              totalPoints: 0,
              breakdown: [],
            };
          }
          pointsMap[key].totalPoints += points;
          pointsMap[key].breakdown.push({ challengeName: ch.name, rank, points });
        });
      }

      // 5) Sort by total points desc
      const sorted = Object.entries(pointsMap)
        .map(([key, val]) => ({ participantKey: key, ...val, challengeBreakdown: val.breakdown }))
        .sort((a, b) => b.totalPoints - a.totalPoints);

      setEntries(sorted);
      setLoading(false);
    };

    compute();

    // Realtime: recompute when any registration changes
    const channel = supabase
      .channel("overall-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, () => {
        compute();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-card animate-pulse rounded-lg border border-border" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Noch keine verifizierten Ergebnisse vorhanden.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-4">
        Punkte: 1. Platz = 15 · 2. = 12 · 3. = 10 · 4. = 8 · 5. = 5 · weitere = 1 · Pass/Fail = 10
      </p>
      {entries.map((entry, idx) => {
        const rank = idx + 1;
        return (
          <div key={entry.participantKey} className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
            <div className="w-6 flex justify-center flex-shrink-0">
              {getRankIcon(rank)}
            </div>
            {entry.user_id ? (
              <Link to={`/profil/${entry.user_id}`}>
                <Avatar className="w-8 h-8 border border-border hover:ring-2 hover:ring-primary transition-all">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-[10px]">
                    {getInitials(entry.participant_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="w-8 h-8 border border-border">
                <AvatarFallback className="bg-muted text-[10px]">
                  {getInitials(entry.participant_name)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              {entry.user_id ? (
                <Link to={`/profil/${entry.user_id}`} className="text-sm font-medium hover:text-primary transition-colors truncate block">
                  {entry.participant_name}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground truncate block">{entry.participant_name}</span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {entry.challengeBreakdown.length} Challenge{entry.challengeBreakdown.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold font-mono text-primary">{entry.totalPoints}</span>
              <span className="text-xs text-muted-foreground">Pkt.</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
