import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";

interface Registration {
  id: string;
  participant_name: string;
  score: number;
  created_at: string;
  user_id: string | null;
  avatar_url: string | null;
}

interface LeaderboardProps {
  challengeId: string;
}

export const Leaderboard = ({ challengeId }: LeaderboardProps) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegistrations = async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          id, 
          participant_name, 
          score, 
          created_at,
          user_id
        `)
        .eq("challenge_id", challengeId)
        .order("score", { ascending: false })
        .order("created_at", { ascending: true });

      if (!error && data) {
        // Fetch profiles for users with user_id
        const userIds = data
          .filter((r) => r.user_id)
          .map((r) => r.user_id as string);

        let profilesMap: Record<string, string | null> = {};
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, avatar_url")
            .in("user_id", userIds);

          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.user_id] = p.avatar_url;
              return acc;
            }, {} as Record<string, string | null>);
          }
        }

        const registrationsWithAvatars = data.map((r) => ({
          ...r,
          avatar_url: r.user_id ? profilesMap[r.user_id] || null : null,
        }));

        setRegistrations(registrationsWithAvatars);
      }
      setLoading(false);
    };

    fetchRegistrations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`registrations-${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "registrations",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          fetchRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-center font-mono text-muted-foreground">{rank}</span>;
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-secondary animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Noch keine Teilnehmer registriert.</p>
        <p className="text-sm mt-1">Sei der Erste!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {registrations.map((registration, index) => (
        <div
          key={registration.id}
          className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
            index < 3 ? "bg-secondary" : "bg-card border border-border"
          }`}
        >
          <div className="flex items-center justify-center w-8">
            {getRankIcon(index + 1)}
          </div>
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={registration.avatar_url || undefined} alt={registration.participant_name} />
            <AvatarFallback className="bg-muted text-sm">
              {getInitials(registration.participant_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{registration.participant_name}</p>
          </div>
          <div className="text-right font-mono">
            <span className="text-primary font-semibold">{registration.score}</span>
            <span className="text-muted-foreground text-sm ml-1">Punkte</span>
          </div>
        </div>
      ))}
    </div>
  );
};
