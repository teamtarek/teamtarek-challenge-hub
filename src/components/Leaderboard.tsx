import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MemberBadge } from "@/components/MemberBadge";
import { Trophy, Medal, Award, CheckCircle, Video, User, Dumbbell, Calendar, Zap } from "lucide-react";
import { getMileLevel, getComplexLevel, getQuadrantLevel, getClassicComplexLevel, getLevelClassName } from "@/lib/mileLevels";
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
  member_type: string | null;
  gender: string | null;
  year: number | null;
  murph_version: string | null;
  validation_type: string | null;
  video_url: string | null;
  is_verified: boolean;
  kettlebell_weight_kg: number | null;
  total_time_seconds: number | null;
  completion_date: string | null;
  total_reps: number | null;
}

type MemberType = "webmaster" | "admin" | "member" | "prospect";

interface LeaderboardProps {
  challengeId: string;
  challengeSlug?: string;
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

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const Leaderboard = ({ challengeId, challengeSlug }: LeaderboardProps) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterVersion, setFilterVersion] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const isMurphChallenge = challengeSlug?.toLowerCase().includes("murph");
  const isSnatchTest = challengeSlug === "5-minute-snatch-test";
  const isSecretServiceSnatchTest = challengeSlug === "secret-service-snatch-test";
  const isSimpleSinister = challengeSlug === "simple-sinister";
  const isRiteOfPassage = challengeSlug === "rite-of-passage";
  const isMeetBetty = challengeSlug === "meet-betty";
  const isTheMile = challengeSlug === "the-mile";
  const is5k = challengeSlug === "5-kilometer-run";
  const is10k = challengeSlug === "10-kilometer-run";
  const isEnduranceRun = isTheMile || is5k || is10k;
  const isKettlebellSwing = challengeSlug === "kettlebell-swing";
  const isSpringChallenge = challengeSlug === "spring-challenge-2026";
  const is10RoundsOfPain = challengeSlug === "10-rounds-of-pain";
  const is1234Complex = challengeSlug === "1234-complex";
  const isTheQuadrant = challengeSlug === "the-quadrant";
  const isKettlebellChallenge = isSnatchTest || isSecretServiceSnatchTest || isSimpleSinister || isRiteOfPassage || isMeetBetty;
  const isTimeSortedChallenge = isEnduranceRun || isMeetBetty || isSpringChallenge || is10RoundsOfPain || isTheQuadrant;

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
          is_verified,
          kettlebell_weight_kg,
          total_time_seconds,
          completion_date,
          total_reps
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

        let profilesMap: Record<string, { avatar_url: string | null; gender: string | null }> = {};
        let memberTypesMap: Record<string, string | null> = {};
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, avatar_url, gender")
            .in("user_id", userIds);

          if (profiles) {
            profilesMap = profiles.reduce((acc, p) => {
              acc[p.user_id] = { avatar_url: p.avatar_url, gender: p.gender };
              return acc;
            }, {} as Record<string, { avatar_url: string | null; gender: string | null }>);
          }

          // Fetch member types for each user
          for (const userId of userIds) {
            const { data: memberTypeData } = await supabase
              .rpc("get_user_member_type", { _user_id: userId });
            if (memberTypeData) {
              memberTypesMap[userId] = memberTypeData;
            }
          }
        }

        const registrationsWithAvatars = data.map((r) => ({
          ...r,
          score: r.score ?? 0,
          avatar_url: r.user_id ? profilesMap[r.user_id]?.avatar_url || null : null,
          member_type: r.user_id ? memberTypesMap[r.user_id] || null : null,
          gender: r.user_id ? profilesMap[r.user_id]?.gender || null : null,
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

  // Sorting logic based on challenge type
  const getSortedRegistrations = (regs: Registration[]) => {
    if (isKettlebellSwing) {
      // Pass first, then total swings desc, then weight desc
      return [...regs].sort((a, b) => {
        const passDiff = (b.score || 0) - (a.score || 0);
        if (passDiff !== 0) return passDiff;
        const repsDiff = (b.total_reps || 0) - (a.total_reps || 0);
        if (repsDiff !== 0) return repsDiff;
        return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
      });
    } else if (isSnatchTest || isSecretServiceSnatchTest) {
      return [...regs].sort((a, b) => (b.total_reps || 0) - (a.total_reps || 0));
    } else if (isEnduranceRun || isSpringChallenge) {
      return [...regs].sort((a, b) => {
        const timeA = a.total_time_seconds || Infinity;
        const timeB = b.total_time_seconds || Infinity;
        return timeA - timeB;
      });
    } else if (is10RoundsOfPain || isTheQuadrant) {
      // Primary: fastest time, Secondary: heavier weight is better
      return [...regs].sort((a, b) => {
        const timeA = a.total_time_seconds || Infinity;
        const timeB = b.total_time_seconds || Infinity;
        if (timeA !== timeB) return timeA - timeB;
        return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
      });
    } else if (is1234Complex) {
      // Primary: more rounds, Secondary: faster time, Tertiary: heavier weight
      return [...regs].sort((a, b) => {
        const roundsDiff = (b.total_reps || 0) - (a.total_reps || 0);
        if (roundsDiff !== 0) return roundsDiff;
        const timeA = a.total_time_seconds || Infinity;
        const timeB = b.total_time_seconds || Infinity;
        if (timeA !== timeB) return timeA - timeB;
        return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
      });
    } else if (isMeetBetty) {
      // Primary: fastest time, Secondary: higher level, Tertiary: heavier weight
      return [...regs].sort((a, b) => {
        const timeA = a.total_time_seconds || Infinity;
        const timeB = b.total_time_seconds || Infinity;
        if (timeA !== timeB) return timeA - timeB;
        const levelDiff = (b.score || 0) - (a.score || 0);
        if (levelDiff !== 0) return levelDiff;
        return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
      });
    } else if (isRiteOfPassage) {
      // Primary: more rounds, Secondary: faster time, Tertiary: heavier weight
      return [...regs].sort((a, b) => {
        const roundsDiff = (b.total_reps || 0) - (a.total_reps || 0);
        if (roundsDiff !== 0) return roundsDiff;
        const timeA = a.total_time_seconds || Infinity;
        const timeB = b.total_time_seconds || Infinity;
        if (timeA !== timeB) return timeA - timeB;
        return (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
      });
    } else if (isSimpleSinister) {
      // Primary: higher level, Secondary: heavier weight, Tertiary: faster time
      return [...regs].sort((a, b) => {
        const levelDiff = (b.score || 0) - (a.score || 0);
        if (levelDiff !== 0) return levelDiff;
        const weightDiff = (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
        if (weightDiff !== 0) return weightDiff;
        const timeA = a.total_time_seconds || Infinity;
        const timeB = b.total_time_seconds || Infinity;
        return timeA - timeB;
      });
    } else {
      return [...regs].sort((a, b) => (a.score || 0) - (b.score || 0));
    }
  };

  const hasResult = (reg: Registration) => {
    if (isKettlebellSwing) return reg.total_reps && reg.total_reps > 0;
    if (isSnatchTest || isSecretServiceSnatchTest) return reg.total_reps && reg.total_reps > 0;
    if (isEnduranceRun || isSpringChallenge || is10RoundsOfPain || isTheQuadrant) return reg.total_time_seconds && reg.total_time_seconds > 0;
    if (is1234Complex) return reg.total_reps && reg.total_reps > 0;
    if (isRiteOfPassage) return (reg.total_reps && reg.total_reps > 0) || (reg.score && reg.score > 0);
    if (isSimpleSinister) return reg.score && reg.score > 0;
    if (isMeetBetty) return reg.total_time_seconds && reg.total_time_seconds > 0;
    return reg.score && reg.score > 0;
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

  // Filter registrations - only show verified results
  const filteredRegistrations = registrations.filter((r) => {
    // Only show verified results
    if (!r.is_verified) return false;
    if (filterYear !== "all" && r.year !== parseInt(filterYear)) return false;
    if (filterVersion !== "all" && r.murph_version !== filterVersion) return false;
    return true;
  });

  // Re-rank after filtering (only those with results)
  const sortedRegistrations = getSortedRegistrations(filteredRegistrations);
  const rankedRegistrations = sortedRegistrations.filter(hasResult);
  const unrankedRegistrations = sortedRegistrations.filter((r) => !hasResult(r));

  const renderResultColumn = (registration: Registration) => {
    if (isKettlebellSwing) {
      return (
        <div className="text-right">
          <div className="font-mono">
            <span className={`font-semibold text-lg ${registration.score === 1 ? "text-green-500" : "text-destructive"}`}>
              {registration.score === 1 ? "Pass ✓" : "Fail ✗"}
            </span>
          </div>
          {registration.total_reps && (
            <div className="text-sm text-primary font-semibold">
              {registration.total_reps.toLocaleString()} Swings
            </div>
          )}
          {registration.kettlebell_weight_kg && (
            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Dumbbell className="w-3 h-3" />
              {registration.kettlebell_weight_kg} kg
            </div>
          )}
        </div>
      );
    } else if (isSnatchTest || isSecretServiceSnatchTest) {
      return (
        <div className="text-right">
          <div className="font-mono">
            <span className="text-primary font-semibold text-lg">
              {registration.total_reps || "-"} Reps
            </span>
          </div>
          {registration.completion_date && (
            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(registration.completion_date)}
            </div>
          )}
        </div>
      );
    } else if (isSpringChallenge) {
      return (
        <div className="text-right">
          <div className="font-mono">
            <span className="text-primary font-semibold text-lg">
              {formatTime(registration.total_time_seconds)}
            </span>
          </div>
        </div>
      );
    } else if (is10RoundsOfPain || isTheQuadrant) {
      const quadrantLevel = isTheQuadrant ? getQuadrantLevel(
        registration.total_time_seconds || 0,
        registration.kettlebell_weight_kg || 0,
        registration.gender
      ) : null;
      return (
        <div className="text-right">
          <div className="font-mono">
            <span className="text-primary font-semibold text-lg">
              {formatTime(registration.total_time_seconds)}
            </span>
          </div>
          {quadrantLevel && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${quadrantLevel.className}`}>
              <Zap className="w-3 h-3" />
              {quadrantLevel.label}
            </span>
          )}
          {registration.kettlebell_weight_kg && (
            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Dumbbell className="w-3 h-3" />
              {registration.kettlebell_weight_kg} kg
            </div>
          )}
        </div>
      );
    } else if (is1234Complex) {
      const complexLevel = getComplexLevel(
        registration.total_reps || 0,
        registration.total_time_seconds || 0,
        registration.kettlebell_weight_kg || 0,
        registration.gender
      );
      return (
        <div className="text-right">
          <div className="font-mono">
            <span className="text-primary font-semibold text-lg">
              {registration.total_reps || "-"} Runden
            </span>
          </div>
          {registration.total_time_seconds && registration.total_time_seconds > 0 && (
            <div className="text-xs text-muted-foreground">
              Zeit: {formatTime(registration.total_time_seconds)}
            </div>
          )}
          {complexLevel && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${complexLevel.className}`}>
              <Zap className="w-3 h-3" />
              {complexLevel.label}
            </span>
          )}
          {registration.kettlebell_weight_kg && (
            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Dumbbell className="w-3 h-3" />
              {registration.kettlebell_weight_kg} kg
            </div>
          )}
        </div>
      );
    } else if (isEnduranceRun) {
      const mileLevel = getMileLevel(registration.total_time_seconds || 0, registration.gender, challengeSlug);
      return (
        <div className="text-right">
          <div className="font-mono">
            <span className="text-primary font-semibold text-lg">
              {formatTime(registration.total_time_seconds)}
            </span>
          </div>
          {mileLevel && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${mileLevel.className}`}>
              <Zap className="w-3 h-3" />
              {mileLevel.label}
            </span>
          )}
        </div>
      );
    } else if (isRiteOfPassage) {
      return (
        <div className="text-right">
          {registration.total_reps && registration.total_reps > 0 && (
            <div className="font-mono">
              <span className="text-primary font-semibold text-lg">
                {registration.total_reps} Runden
              </span>
            </div>
          )}
          {registration.score && registration.score >= 1 && registration.score <= 4 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border mb-1 ${getLevelClassName(registration.score)}`}>
              <Zap className="w-3 h-3" />
              Level {registration.score}
            </span>
          )}
          {registration.total_time_seconds && (
            <div className="text-xs text-muted-foreground">
              Zeit: {formatTime(registration.total_time_seconds)}
            </div>
          )}
          {registration.kettlebell_weight_kg && (
            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Dumbbell className="w-3 h-3" />
              {registration.kettlebell_weight_kg} kg
            </div>
          )}
        </div>
      );
    } else if (isMeetBetty) {
      return (
        <div className="text-right">
          {registration.total_time_seconds && (
            <div className="font-mono">
              <span className="text-primary font-semibold text-lg">
                {formatTime(registration.total_time_seconds)}
              </span>
            </div>
          )}
          {registration.score && registration.score >= 1 && registration.score <= 4 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
              registration.score === 4 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
              registration.score === 3 ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
              registration.score === 2 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
              "bg-green-500/20 text-green-400 border-green-500/30"
            }`}>
              <Zap className="w-3 h-3" />
              Level {registration.score}
            </span>
          )}
          {registration.kettlebell_weight_kg && (
            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Dumbbell className="w-3 h-3" />
              {registration.kettlebell_weight_kg} kg
            </div>
          )}
        </div>
      );
    } else if (isSimpleSinister) {
      return (
        <div className="text-right">
          {registration.score && registration.score >= 1 && registration.score <= 4 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border mb-1 ${getLevelClassName(registration.score)}`}>
              <Zap className="w-3 h-3" />
              Level {registration.score}
            </span>
          )}
          {registration.kettlebell_weight_kg && (
            <div className="font-mono">
              <span className="text-primary font-semibold text-lg">
                {registration.kettlebell_weight_kg} kg
              </span>
            </div>
          )}
          {registration.total_time_seconds && registration.total_time_seconds > 0 && (
            <div className="text-xs text-muted-foreground">
              Zeit: {formatTime(registration.total_time_seconds)}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="text-right font-mono">
          <span className="text-primary font-semibold text-lg">{formatTime(registration.score)}</span>
        </div>
      );
    }
  };

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

        {isMurphChallenge && (
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
        )}
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
              {registration.user_id ? (
                <Link to={`/profil/${registration.user_id}`}>
                  <Avatar className="w-10 h-10 border border-border hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={registration.avatar_url || undefined} alt={registration.participant_name} />
                    <AvatarFallback className="bg-muted text-sm">
                      {getInitials(registration.participant_name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={registration.avatar_url || undefined} alt={registration.participant_name} />
                  <AvatarFallback className="bg-muted text-sm">
                    {getInitials(registration.participant_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {registration.user_id ? (
                    <Link to={`/profil/${registration.user_id}`} className="font-medium truncate hover:text-primary transition-colors flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {registration.participant_name}
                    </Link>
                  ) : (
                    <p className="font-medium truncate text-muted-foreground">{registration.participant_name}</p>
                  )}
                  {registration.member_type && (
                    <MemberBadge memberType={registration.member_type as MemberType} size="sm" />
                  )}
                  {registration.is_verified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Geprüftes Ergebnis</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  {isKettlebellChallenge && registration.kettlebell_weight_kg && !isSnatchTest && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Dumbbell className="w-3 h-3" />
                      {registration.kettlebell_weight_kg} kg
                    </span>
                  )}
                  {isSnatchTest && registration.kettlebell_weight_kg && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Dumbbell className="w-3 h-3" />
                      {registration.kettlebell_weight_kg} kg
                    </span>
                  )}
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
              {renderResultColumn(registration)}
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
              {registration.user_id ? (
                <Link to={`/profil/${registration.user_id}`}>
                  <Avatar className="w-10 h-10 border border-border hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={registration.avatar_url || undefined} alt={registration.participant_name} />
                    <AvatarFallback className="bg-muted text-sm">
                      {getInitials(registration.participant_name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={registration.avatar_url || undefined} alt={registration.participant_name} />
                  <AvatarFallback className="bg-muted text-sm">
                    {getInitials(registration.participant_name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {registration.user_id ? (
                    <Link to={`/profil/${registration.user_id}`} className="font-medium truncate hover:text-primary transition-colors flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {registration.participant_name}
                    </Link>
                  ) : (
                    <p className="font-medium truncate text-muted-foreground">{registration.participant_name}</p>
                  )}
                  {registration.member_type && (
                    <MemberBadge memberType={registration.member_type as MemberType} size="sm" />
                  )}
                  {registration.is_verified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Geprüftes Ergebnis</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  {isKettlebellChallenge && registration.kettlebell_weight_kg && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Dumbbell className="w-3 h-3" />
                      {registration.kettlebell_weight_kg} kg
                    </span>
                  )}
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
                <span className="text-muted-foreground">Kein Ergebnis</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};