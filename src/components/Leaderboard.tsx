import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, CheckCircle, Video, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Registration {
  id: string;
  participant_name: string;
  score: number;
  created_at: string;
  user_id: string | null;
  avatar_url: string | null;
  year: number | null;
  murph_version: string | null;
  validation_type: string | null;
  video_url: string | null;
  is_verified: boolean;
}

interface LeaderboardProps {
  challengeId: string;
}

const MURPH_VERSIONS = ["Standard", "Female Version", "Beginner Version"] as const;

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

export const Leaderboard = ({ challengeId }: LeaderboardProps) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterVersion, setFilterVersion] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchRegistrations = async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          id, 
          participant_name, 
          score, 
          created_at,
          user_id,
          year,
          murph_version,
          validation_type,
          video_url,
          is_verified
        `)
        .eq("challenge_id", challengeId)
        .order("score", { ascending: true })
        .order("created_at", { ascending: true });

      if (!error && data) {
        // Extract unique years
        const years = [...new Set(data.map((r) => r.year).filter((y): y is number => y !== null))].sort((a, b) => b - a);
        setAvailableYears(years);

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
          score: r.score ?? 0,
          avatar_url: r.user_id ? profilesMap[r.user_id] || null : null,
          is_verified: r.is_verified ?? false,
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

  // Filter registrations
  const filteredRegistrations = registrations.filter((r) => {
    if (filterYear !== "all" && r.year !== parseInt(filterYear)) return false;
    if (filterVersion !== "all" && r.murph_version !== filterVersion) return false;
    return true;
  });

  // Re-rank after filtering (only those with times)
  const rankedRegistrations = filteredRegistrations
    .filter((r) => r.score && r.score > 0)
    .sort((a, b) => a.score - b.score);

  const unrankedRegistrations = filteredRegistrations.filter((r) => !r.score || r.score === 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Jahr" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Jahre</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterVersion} onValueChange={setFilterVersion}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Versionen</SelectItem>
            {MURPH_VERSIONS.map((version) => (
              <SelectItem key={version} value={version}>
                {version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredRegistrations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Keine Teilnehmer für diese Filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rankedRegistrations.map((registration, index) => (
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
                <div className="flex items-center gap-2">
                  <p className="font-medium">{registration.participant_name}</p>
                  {registration.is_verified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Geprüftes Ergebnis</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {registration.murph_version && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {registration.murph_version}
                    </span>
                  )}
                  {registration.year && <span>{registration.year}</span>}
                  {registration.validation_type === "video" ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                      <Video className="w-3 h-3" />
                      Video
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                      <User className="w-3 h-3" />
                      Coach
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-primary font-semibold text-lg">{formatTime(registration.score)}</span>
              </div>
            </div>
          ))}
          {unrankedRegistrations.map((registration) => (
            <div
              key={registration.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border opacity-70"
            >
              <div className="flex items-center justify-center w-8">
                <span className="text-muted-foreground">-</span>
              </div>
              <Avatar className="w-10 h-10 border border-border">
                <AvatarImage src={registration.avatar_url || undefined} alt={registration.participant_name} />
                <AvatarFallback className="bg-muted text-sm">
                  {getInitials(registration.participant_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{registration.participant_name}</p>
                  {registration.is_verified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Geprüftes Ergebnis</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {registration.murph_version && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {registration.murph_version}
                    </span>
                  )}
                  {registration.year && <span>{registration.year}</span>}
                  {registration.validation_type === "video" ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                      <Video className="w-3 h-3" />
                      Video
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500">
                      <User className="w-3 h-3" />
                      Coach
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-muted-foreground">Keine Zeit</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
