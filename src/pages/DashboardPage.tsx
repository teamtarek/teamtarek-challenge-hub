import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { MemberBadge } from "@/components/MemberBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Trophy, Dumbbell, ArrowRight, Clock, Check, X, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StarterJourneyPanel } from "@/components/StarterJourneyPanel";
import { de } from "date-fns/locale";


interface RecentThread {
  id: string;
  title: string;
  category: string;
  created_at: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  comment_count: number;
}

interface UserChallenge {
  id: string;
  challenge_name: string;
  challenge_slug: string;
  challenge_category: string;
  is_verified: boolean;
  score: number | null;
  registration_status: string | null;
  deadline_at: string | null;
  blocked_until: string | null;
}

interface LeaderboardEntry {
  participant_name: string;
  score: number;
  challenge_name: string;
  user_id: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  allgemein: "Allgemein",
  "training-draussen": "Training draußen",
  "challenges-ergebnisse": "Challenges & Ergebnisse",
  "technik-fragen": "Technik & Fragen",
  "motivation-mindset": "Motivation / Mindset",
  "prae-postnatales-training": "Prä- / Postnatales Training",
  "off-topic": "Off-Topic",
  "outdoor-training": "Outdoor Training",
  challenges: "Challenges",
  "coaches-corner": "Coaches Corner",
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { memberType } = useUserRole();
  const [threads, setThreads] = useState<RecentThread[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      // Fetch recent threads
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, title, category, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(5);

      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map((p) => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = (profiles || []).reduce(
          (acc, p) => ({ ...acc, [p.user_id]: p }),
          {} as Record<string, { display_name: string | null; avatar_url: string | null }>
        );

        // Get comment counts
        const postIds = postsData.map((p) => p.id);
        const { data: comments } = await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds);

        const commentCounts: Record<string, number> = {};
        (comments || []).forEach((c) => {
          commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
        });

        setThreads(
          postsData.map((p) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            created_at: p.created_at,
            user_id: p.user_id,
            display_name: profileMap[p.user_id]?.display_name || null,
            avatar_url: profileMap[p.user_id]?.avatar_url || null,
            comment_count: commentCounts[p.id] || 0,
          }))
        );
      }

      // Fetch user's challenges
      const { data: regData } = await supabase
        .from("registrations")
        .select("id, score, is_verified, registration_status, deadline_at, challenge_id, challenges(name, slug, category)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch cooldowns
      const { data: cooldownData } = await supabase
        .from("benchmark_cooldowns")
        .select("challenge_id, blocked_until")
        .eq("user_id", user.id);

      const cooldownMap = (cooldownData || []).reduce(
        (acc, c) => ({ ...acc, [c.challenge_id]: c.blocked_until }),
        {} as Record<string, string>
      );

      if (regData) {
        setUserChallenges(
          regData.map((r: any) => ({
            id: r.id,
            challenge_name: r.challenges?.name || "Challenge",
            challenge_slug: r.challenges?.slug || "",
            challenge_category: r.challenges?.category || "",
            is_verified: r.is_verified || false,
            score: r.score,
            registration_status: r.registration_status || "registered",
            deadline_at: r.deadline_at,
            blocked_until: cooldownMap[r.challenge_id] || null,
          }))
        );
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="container py-12">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-card animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      {/* Starter Journey */}
      <StarterJourneyPanel />

      {/* Welcome */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Willkommen zurück</h1>
        <p className="text-muted-foreground">
          Hier siehst du, was in der Community los ist.
        </p>
      </div>

      {/* Active Discussions */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Aktive Diskussionen
          </h2>
          <Link
            to="/community"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Alle anzeigen <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {threads.length === 0 ? (
          <div className="bg-card border border-border p-6 text-center text-muted-foreground">
            Noch keine Diskussionen. Starte die erste!
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                to={`/community/${thread.id}`}
                className="flex items-center gap-4 bg-card border border-border p-4 hover:border-primary/30 transition-colors"
              >
                <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                  <AvatarImage src={thread.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {thread.display_name?.slice(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{thread.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{CATEGORY_LABELS[thread.category] || thread.category}</span>
                    <span>•</span>
                    <span>{thread.display_name || "Anonym"}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(thread.created_at), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {thread.comment_count}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* User's Challenges */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Deine Challenges
          </h2>
          <Link
            to="/challenges"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Alle Challenges <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {userChallenges.length === 0 ? (
          <div className="bg-card border border-border p-6 text-center text-muted-foreground">
            <p className="mb-2">Du nimmst noch an keiner Challenge teil.</p>
            <Link to="/challenges" className="text-primary hover:underline text-sm">
              Challenges entdecken →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Deduplicate by challenge_slug, keep latest */}
            {(() => {
              const seen = new Set<string>();
              const unique = userChallenges.filter((ch) => {
                if (seen.has(ch.challenge_slug)) return false;
                seen.add(ch.challenge_slug);
                return true;
              });
              const displayed = unique.slice(0, 3);
              return (
                <>
                  {displayed.map((ch) => (
                    <Link
                      key={ch.id}
                      to={`/challenge/${ch.challenge_slug}`}
                      className="flex items-center justify-between bg-card border border-border p-4 rounded-lg hover:border-primary/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{ch.challenge_name}</p>
                        <p className="text-xs flex items-center gap-1">
                          {ch.registration_status === "completed" ? (
                            <span className="flex items-center gap-1 text-green-500">
                              <Check className="w-3.5 h-3.5" />
                              Abgeschlossen
                              {ch.is_verified && " · Verifiziert"}
                            </span>
                          ) : ch.registration_status === "fail" ? (
                            <span className="flex items-center gap-1 text-red-500">
                              <X className="w-3.5 h-3.5" />
                              Nicht bestanden
                            </span>
                          ) : ch.registration_status === "blocked" || (ch.blocked_until && new Date(ch.blocked_until) > new Date()) ? (
                            <span className="flex items-center gap-1 text-red-500">
                              <Lock className="w-3.5 h-3.5" />
                              Gesperrt
                              {ch.blocked_until && (
                                <span className="text-muted-foreground ml-1">
                                  bis {new Date(ch.blocked_until).toLocaleDateString("de-DE")}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-500">
                              <Clock className="w-3.5 h-3.5" />
                              Registriert
                              {ch.deadline_at && (
                                <span className="text-muted-foreground ml-1">
                                  · Frist: {new Date(ch.deadline_at).toLocaleDateString("de-DE")}
                                </span>
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  ))}
                  {unique.length > 3 && (
                    <Link
                      to="/challenges"
                      className="block text-center text-sm text-primary hover:underline py-3 bg-card border border-border rounded-lg"
                    >
                      Alle Challenges anzeigen →
                    </Link>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

      {/* Leaderboard Preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Leaderboard
          </h2>
          <Link
            to="/leaderboard"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Vollständig anzeigen <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-card border border-border p-6 text-center text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-primary/50" />
          <p className="mb-2">Ergebnisse aus allen Challenges an einem Ort.</p>
          <Link to="/leaderboard" className="text-primary hover:underline text-sm">
            Zum Leaderboard →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
