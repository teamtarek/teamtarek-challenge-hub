import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationForm } from "@/components/RegistrationForm";
import { ResultEntryForm } from "@/components/ResultEntryForm";
import { VideoEmbed, isValidVideoUrl } from "@/components/VideoEmbed";
import { Leaderboard } from "@/components/Leaderboard";
// Header removed - using AppLayout
import { useBenchmarkDeadlineCheck } from "@/hooks/useBenchmarkDeadlineCheck";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Dumbbell, Users, Lock, Zap, LogOut, Loader2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MILE_LEVEL_DESCRIPTIONS, FIVE_K_LEVEL_DESCRIPTIONS, TEN_K_LEVEL_DESCRIPTIONS, COMPLEX_1234_LEVEL_DESCRIPTIONS, MEET_BETTY_LEVEL_DESCRIPTIONS, RITE_OF_PASSAGE_LEVEL_DESCRIPTIONS, SIMPLE_SINISTER_LEVEL_DESCRIPTIONS, QUADRANT_LEVEL_DESCRIPTIONS, CLASSIC_COMPLEX_LEVEL_DESCRIPTIONS, SNATCH_TEST_INFO, SSST_LEVEL_DESCRIPTIONS, SOLDIER_LEVEL_DESCRIPTIONS } from "@/lib/mileLevels";

// Import challenge hero images
import springChallenge from "@/assets/challenges/spring-challenge.jpg";
import murph from "@/assets/challenges/murph.jpg";
import deadlyDozen from "@/assets/challenges/deadly-dozen.jpg";
import summerChallenge from "@/assets/challenges/summer-challenge.jpg";
import kettlebell from "@/assets/challenges/kettlebell.jpg";
import winterChallenge from "@/assets/challenges/winter-challenge.jpg";
import pumpRow from "@/assets/challenges/pump-row.jpg";
import tareksTrifecta from "@/assets/challenges/tareks-trifecta.jpg";
import armyFitnessTest from "@/assets/challenges/army-fitness-test.jpg";
import snatchTest from "@/assets/challenges/5-minute-snatch-test.jpg";
import simpleSinister from "@/assets/challenges/simple-sinister.jpg";
import riteOfPassage from "@/assets/challenges/rite-of-passage.jpg";
import meetBetty from "@/assets/challenges/meet-betty.jpg";
import theMile from "@/assets/challenges/the-mile.jpg";
import secretServiceSnatchTest from "@/assets/challenges/secret-service-snatch-test.jpg";
import fiveKRun from "@/assets/challenges/5-kilometer-run.jpg";
import tenKRun from "@/assets/challenges/10-kilometer-run.jpg";
import halfMarathon from "@/assets/challenges/half-marathon.jpg";
import complex1234 from "@/assets/challenges/1234-complex.jpg";
import theQuadrant from "@/assets/challenges/the-quadrant.jpg";
import theClassicComplex from "@/assets/challenges/the-classic-complex.jpg";
import strengthChallenge from "@/assets/challenges/1234-strength-challenge.jpg";
import theSoldier from "@/assets/challenges/the-soldier.jpg";
import heroBg from "@/assets/hero-bg.jpg";

interface Challenge {
  id: string;
  slug: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
  category: string;
  is_benchmark?: boolean | null;
}

const getChallengeHeroImage = (slug: string): string => {
  const imageMap: Record<string, string> = {
    "spring-challenge-2026": springChallenge,
    "murph-2026": murph,
    "deadly-dozen": deadlyDozen,
    "summer-challenge-2026": summerChallenge,
    "kettlebell-swing-2026": kettlebell,
    "winter-challenge-2026": winterChallenge,
    "pump-row": pumpRow,
    "tareks-trifecta": tareksTrifecta,
    "army-fitness-test": armyFitnessTest,
    "5-minute-snatch-test": snatchTest,
    "simple-sinister": simpleSinister,
    "rite-of-passage": riteOfPassage,
    "meet-betty": meetBetty,
    "the-mile": theMile,
    "secret-service-snatch-test": secretServiceSnatchTest,
    "5-kilometer-run": fiveKRun,
    "10-kilometer-run": tenKRun,
    "half-marathon": halfMarathon,
    "1234-complex": complex1234,
    "the-quadrant": theQuadrant,
    "the-classic-complex": theClassicComplex,
    "1234-strength-challenge": strengthChallenge,
    "the-soldier": theSoldier,
  };
  return imageMap[slug] || heroBg;
};

// Custom background positions for specific challenges
const getChallengeBackgroundPosition = (slug: string): string => {
  const positionMap: Record<string, string> = {
    "winter-challenge-2026": "center 20%",
    "5-minute-snatch-test": "center top",
    "deadly-dozen": "center top",
    "the-quadrant": "center 35%",
    "the-classic-complex": "center 40%",
    "1234-complex": "center 40%",
    "10-rounds-of-pain": "center 40%",
    "secret-service-snatch-test": "center 40%",
    "1234-strength-challenge": "center 60%",
  };
  return positionMap[slug] || "center";
};

// Custom background size for specific challenges
const getChallengeBackgroundSize = (slug: string): string => {
  const sizeMap: Record<string, string> = {
    "5-minute-snatch-test": "contain",
  };
  return sizeMap[slug] || "cover";
};

const formatDateRange = (start: string, end: string | null) => {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  
  if (!endDate || start === end) {
    return startDate.toLocaleDateString("de-DE", options);
  }
  
  return `${startDate.toLocaleDateString("de-DE", options)} - ${endDate.toLocaleDateString("de-DE", options)}`;
};

const ChallengePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  useBenchmarkDeadlineCheck();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [existingResult, setExistingResult] = useState<{
    score: number | null;
    total_time_seconds: number | null;
    total_reps: number | null;
    kettlebell_weight_kg: number | null;
    completion_date: string | null;
  }>({ score: null, total_time_seconds: null, total_reps: null, kettlebell_weight_kg: null, completion_date: null });
  const [unregistering, setUnregistering] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [benchmarkStatus, setBenchmarkStatus] = useState<{
    isBenchmark: boolean;
    registrationStatus: string | null;
    deadlineAt: string | null;
    blockedUntil: string | null;
  }>({ isBenchmark: false, registrationStatus: null, deadlineAt: null, blockedUntil: null });

  useEffect(() => {
    const fetchChallenge = async () => {
      if (!slug) return;

      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) {
        setChallenge(data);
        
        // Check if already registered (for logged-in user or localStorage)
        if (user) {
          // Fetch user gender from profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("gender")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profileData) setUserGender(profileData.gender);

          // For benchmarks: prefer the OPEN ("registered") attempt; otherwise allow new registration.
          // For non-benchmarks: keep single-row behaviour (latest entry).
          const { data: openReg } = await supabase
            .from("registrations")
            .select("id, is_verified, score, total_time_seconds, total_reps, kettlebell_weight_kg, registration_status, deadline_at, completion_date")
            .eq("challenge_id", data.id)
            .eq("user_id", user.id)
            .eq("registration_status", "registered")
            .order("registered_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          let regData = openReg;
          if (!regData && !data.is_benchmark) {
            // Non-benchmark: fall back to most recent entry of any status
            const { data: anyReg } = await supabase
              .from("registrations")
              .select("id, is_verified, score, total_time_seconds, total_reps, kettlebell_weight_kg, registration_status, deadline_at, completion_date")
              .eq("challenge_id", data.id)
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            regData = anyReg;
          }

          if (regData) {
            setIsRegistered(true);
            setRegistrationId(regData.id);
            setIsVerified(regData.is_verified ?? false);
            setExistingResult({
              score: regData.score,
              total_time_seconds: regData.total_time_seconds,
              total_reps: regData.total_reps,
              kettlebell_weight_kg: regData.kettlebell_weight_kg,
              completion_date: (regData as { completion_date?: string | null }).completion_date ?? null,
            });
            setActiveTab("leaderboard");

            // Fetch cooldown if benchmark
            if (data.is_benchmark) {
              const { data: cooldownData } = await supabase
                .from("benchmark_cooldowns")
                .select("blocked_until")
                .eq("user_id", user.id)
                .eq("challenge_id", data.id)
                .maybeSingle();

              setBenchmarkStatus({
                isBenchmark: true,
                registrationStatus: regData.registration_status,
                deadlineAt: regData.deadline_at,
                blockedUntil: cooldownData?.blocked_until ?? null,
              });
            }
          } else if (data.is_benchmark) {
            // Not registered but check for active cooldown
            const { data: cooldownData } = await supabase
              .from("benchmark_cooldowns")
              .select("blocked_until")
              .eq("user_id", user.id)
              .eq("challenge_id", data.id)
              .maybeSingle();

            if (cooldownData && new Date(cooldownData.blocked_until) > new Date()) {
              setBenchmarkStatus({
                isBenchmark: true,
                registrationStatus: null,
                deadlineAt: null,
                blockedUntil: cooldownData.blocked_until,
              });
            }
          }
        } else {
          const registeredChallenges = JSON.parse(localStorage.getItem("registeredChallenges") || "{}");
          if (registeredChallenges[data.id]) {
            setIsRegistered(true);
            setActiveTab("leaderboard");
          }
        }
      }
      setLoading(false);
    };

    fetchChallenge();
  }, [slug, user]);

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
    setActiveTab("details"); // Stay on details so user can enter result
  };

  const handleResultSuccess = async () => {
    if (!challenge || !user) return;
    // Refresh registration data
    if (!registrationId) return;
    const { data: regData } = await supabase
      .from("registrations")
      .select("id, is_verified, score, total_time_seconds, total_reps, kettlebell_weight_kg, completion_date")
      .eq("id", registrationId)
      .maybeSingle();
    if (regData) {
      setIsVerified(regData.is_verified ?? false);
      setExistingResult({
        score: regData.score,
        total_time_seconds: regData.total_time_seconds,
        total_reps: regData.total_reps,
        kettlebell_weight_kg: regData.kettlebell_weight_kg,
        completion_date: (regData as { completion_date?: string | null }).completion_date ?? null,
      });
    }
  };

  const handleUnregister = async () => {
    if (!registrationId || !challenge) return;
    if (!confirm("Möchtest du dich wirklich von dieser Challenge abmelden?")) return;
    
    setUnregistering(true);
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("id", registrationId);

    if (error) {
      toast.error("Abmeldung fehlgeschlagen. Verifizierte Ergebnisse können nicht gelöscht werden.");
    } else {
      setIsRegistered(false);
      setRegistrationId(null);
      setIsVerified(false);
      setActiveTab("details");
      toast.success("Du hast dich erfolgreich abgemeldet.");
      // Clean localStorage too
      const registeredChallenges = JSON.parse(localStorage.getItem("registeredChallenges") || "{}");
      delete registeredChallenges[challenge.id];
      localStorage.setItem("registeredChallenges", JSON.stringify(registeredChallenges));
    }
    setUnregistering(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Challenge nicht gefunden</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    );
  }

  const now = new Date();
  const start = new Date(challenge.start_date);
  const end = challenge.end_date ? new Date(challenge.end_date) : null;
  const isActive = now >= start && (end === null || now <= end);
  const isUpcoming = now < start;
  const heroImage = getChallengeHeroImage(challenge.slug);
  const backgroundPosition = getChallengeBackgroundPosition(challenge.slug);
  const backgroundSize = getChallengeBackgroundSize(challenge.slug);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative min-h-[50vh] flex items-end"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: backgroundSize,
          backgroundPosition: backgroundPosition,
          backgroundRepeat: 'no-repeat',
          backgroundColor: 'hsl(var(--background))',
        }}
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 container pb-12">
          {/* Back Link */}
          <Link
            to="/challenges"
            className="inline-flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Alle Challenges
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span className={`challenge-badge ${isActive ? 'challenge-badge-active' : ''}`}>
              {isActive ? "AKTIV" : isUpcoming ? "BALD" : "BEENDET"}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">{challenge.name}</h1>
          <div className="flex items-center gap-2 text-foreground/70 uppercase tracking-wider text-sm">
            <Calendar className="w-5 h-5" />
            {formatDateRange(challenge.start_date, challenge.end_date)}
          </div>
        </div>
      </section>

      {/* Benchmark Warning Banners */}
      {benchmarkStatus.isBenchmark && (() => {
        const now = new Date();
        const formatDate = (d: string) => new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

        // Active cooldown (blocked)
        if (benchmarkStatus.blockedUntil && new Date(benchmarkStatus.blockedUntil) > now) {
          if (benchmarkStatus.registrationStatus === "fail") {
            return (
              <div className="container pt-6">
                <Alert className="border-destructive/50 bg-destructive/10 max-w-2xl">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <AlertDescription className="text-destructive font-medium ml-2">
                    Frist abgelaufen – kein Ergebnis eingereicht. Nächster Versuch ab {formatDate(benchmarkStatus.blockedUntil)}.
                  </AlertDescription>
                </Alert>
              </div>
            );
          }
          return (
            <div className="container pt-6">
              <Alert className="border-destructive/50 bg-destructive/10 max-w-2xl">
                <Lock className="h-5 w-5 text-destructive" />
                <AlertDescription className="text-destructive font-medium ml-2">
                  Du kannst diese Challenge erst wieder am {formatDate(benchmarkStatus.blockedUntil)} absolvieren.
                </AlertDescription>
              </Alert>
            </div>
          );
        }

        // Registered with deadline in the future
        if (benchmarkStatus.registrationStatus === "registered" && benchmarkStatus.deadlineAt) {
          const deadlineDate = new Date(benchmarkStatus.deadlineAt);
          if (deadlineDate > now) {
            const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div className="container pt-6">
                <Alert className="border-amber-500/50 bg-amber-500/10 max-w-2xl">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <AlertDescription className="text-amber-600 dark:text-amber-400 font-medium ml-2">
                    Du hast noch {daysLeft} {daysLeft === 1 ? "Tag" : "Tage"} um dein Ergebnis einzureichen.
                  </AlertDescription>
                </Alert>
              </div>
            );
          }
        }

        return null;
      })()}

      {/* Content */}
      <div className="container py-12">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-2xl">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="details" className="gap-2">
              <Dumbbell className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Users className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-8">
            {/* Description */}
            <div className="challenge-card">
              <h2 className="text-xl font-semibold mb-4">Über diese Challenge</h2>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {challenge.description?.split('\n').map((line, i) => {
                  // Check if the line contains a video URL
                  const urlMatch = line.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)\S+)/);
                  if (urlMatch && isValidVideoUrl(urlMatch[1])) {
                    const before = line.substring(0, line.indexOf(urlMatch[1])).replace(/🎥\s*Workout\s*Video:\s*/i, '').trim();
                    return (
                      <div key={i}>
                        {before && <span>{before} </span>}
                        <VideoEmbed url={urlMatch[1]} className="mt-3 mb-1" />
                      </div>
                    );
                  }
                  return <span key={i}>{line}{'\n'}</span>;
                })}
              </div>
            </div>

            {/* 1-2-3-4 Strength Challenge Info */}
            {challenge.slug === "1234-strength-challenge" && (
              <div className="challenge-card">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Gewichtsanforderungen</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Übung</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Standard ♂</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Standard ♀</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Beginner ♂</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Beginner ♀</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { lift: "1× Press", sm: "60 kg", sf: "40 kg", bm: "50 kg", bf: "30 kg" },
                        { lift: "2× Bench Press", sm: "100 kg", sf: "60 kg", bm: "80 kg", bf: "40 kg" },
                        { lift: "3× Back Squat", sm: "140 kg", sf: "80 kg", bm: "110 kg", bf: "50 kg" },
                        { lift: "4× Deadlift", sm: "180 kg", sf: "100 kg", bm: "140 kg", bf: "60 kg" },
                      ].map((row) => (
                        <tr key={row.lift} className="border-b border-border/50">
                          <td className="py-3 pr-4 font-medium">{row.lift}</td>
                          <td className="py-3 pr-4 font-mono">{row.sm}</td>
                          <td className="py-3 pr-4 font-mono">{row.sf}</td>
                          <td className="py-3 pr-4 font-mono">{row.bm}</td>
                          <td className="py-3 font-mono">{row.bf}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Die Zahlen 1-2-3-4 beziehen sich auf die Anzahl der Scheiben pro Seite auf der Langhantel.
                </p>
              </div>
            )}

            {/* Mile Level Info Box */}
            {/* Snatch Test Level Info */}
            {challenge.slug === "5-minute-snatch-test" && (
              <div className="challenge-card">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Level-Info</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {SNATCH_TEST_INFO["5-minute-snatch-test"]}
                </p>
              </div>
            )}

            {(challenge.slug === "the-mile" || challenge.slug === "5-kilometer-run" || challenge.slug === "10-kilometer-run" || challenge.slug === "1234-complex" || challenge.slug === "meet-betty" || challenge.slug === "rite-of-passage" || challenge.slug === "simple-sinister" || challenge.slug === "the-quadrant" || challenge.slug === "the-classic-complex" || challenge.slug === "secret-service-snatch-test" || challenge.slug === "the-soldier") && (() => {
              const levelDescriptions = challenge.slug === "5-kilometer-run" 
                ? FIVE_K_LEVEL_DESCRIPTIONS 
                : challenge.slug === "10-kilometer-run" 
                  ? TEN_K_LEVEL_DESCRIPTIONS 
                  : challenge.slug === "1234-complex"
                    ? COMPLEX_1234_LEVEL_DESCRIPTIONS
                    : challenge.slug === "meet-betty"
                      ? MEET_BETTY_LEVEL_DESCRIPTIONS
                      : challenge.slug === "rite-of-passage"
                        ? RITE_OF_PASSAGE_LEVEL_DESCRIPTIONS
                        : challenge.slug === "simple-sinister"
                          ? SIMPLE_SINISTER_LEVEL_DESCRIPTIONS
                   : challenge.slug === "the-quadrant"
                            ? QUADRANT_LEVEL_DESCRIPTIONS
                            : challenge.slug === "the-classic-complex"
                              ? CLASSIC_COMPLEX_LEVEL_DESCRIPTIONS
                               : challenge.slug === "secret-service-snatch-test"
                                ? SSST_LEVEL_DESCRIPTIONS
                                : challenge.slug === "the-soldier"
                                  ? SOLDIER_LEVEL_DESCRIPTIONS
                                  : MILE_LEVEL_DESCRIPTIONS;
              const isComplex = challenge.slug === "1234-complex";
              const isBetty = challenge.slug === "meet-betty";
              const isRoP = challenge.slug === "rite-of-passage";
              const isSS = challenge.slug === "simple-sinister";
              const isQuadrant = challenge.slug === "the-quadrant";
              const isClassicComplex = challenge.slug === "the-classic-complex";
              const isSSST = challenge.slug === "secret-service-snatch-test";
              const isSoldier = challenge.slug === "the-soldier";
              return (
                <div className="challenge-card">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Level-Stufen
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isSoldier
                      ? "Dein Level richtet sich nach dem verwendeten Gewicht. Timecap: 25 Minuten."
                      : isSSST
                      ? "Dein Level wird automatisch aus Gesamtzeit und verwendetem Gewicht berechnet. Nur Zeiten unter 10 Minuten zählen als PASS. Level 4 = Snatch Master Badge!"
                      : isBetty
                      ? "Wähle dein Level basierend auf Übungsvarianten und Gewicht. 5 Runden auf Zeit – Zielzeit: 10 Minuten."
                      : isRoP
                        ? "Wähle dein Level basierend auf Leiter-Struktur und Gewicht."
                        : isSS
                          ? "Wähle dein Level basierend auf dem verwendeten Gewicht. Zielzeit: 20 Minuten."
                          : isQuadrant
                             ? "Dein Level wird automatisch aus Gesamtzeit und Gewicht berechnet. 10 Runden in max. 20 Minuten."
                            : isClassicComplex
                              ? "Dein Level wird automatisch aus Runden und Gewicht berechnet."
                              : isComplex 
                                ? "Dein Level wird automatisch aus Runden, Zeit und Gewicht berechnet."
                                : "Erreiche ein Level basierend auf deiner Laufzeit. Die Anforderungen unterscheiden sich nach Geschlecht."}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Level</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Männer</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Frauen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {levelDescriptions.map((l) => (
                          <tr key={l.level} className="border-b border-border/50">
                            <td className="py-3 pr-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${
                                l.level === 4 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                l.level === 3 ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                                l.level === 2 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                "bg-green-500/20 text-green-400 border-green-500/30"
                              }`}>
                                <Zap className="w-3 h-3" />
                                Level {l.level}
                              </span>
                            </td>
                            <td className="py-3 pr-4 font-mono">{l.male}</td>
                            <td className="py-3 font-mono">{l.female}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Registration: show form when no OPEN attempt exists and no active cooldown.
                For benchmarks users can register again after a previous completed attempt. */}
            {(() => {
              const cooldownActive = !!(benchmarkStatus.blockedUntil && new Date(benchmarkStatus.blockedUntil) > new Date());
              const hasOpenAttempt = isRegistered && benchmarkStatus.registrationStatus === "registered";
              const showRegistration = !cooldownActive && (
                challenge.is_benchmark ? !hasOpenAttempt : !isRegistered
              );
              if (!showRegistration) return null;
              return (
                <div className="challenge-card">
                  <h2 className="text-xl font-semibold mb-4">Jetzt teilnehmen</h2>
                  {!user && (
                    <p className="text-sm text-muted-foreground mb-4">
                      <Link to="/auth" className="text-foreground hover:underline">Melde dich an</Link> um deine Fortschritte zu tracken, oder registriere dich als Gast.
                    </p>
                  )}
                  {challenge.is_benchmark && isRegistered && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Du hast diese Challenge bereits absolviert. Du kannst einen neuen Versuch starten – maximal ein Eintrag pro Monat ist möglich.
                    </p>
                  )}
                  <RegistrationForm
                    challengeId={challenge.id}
                    challengeName={challenge.name}
                    challengeSlug={challenge.slug}
                    isBenchmark={!!challenge.is_benchmark}
                    onSuccess={handleRegistrationSuccess}
                  />
                </div>
              );
            })()}
            {(() => {
              const cooldownActive = !!(benchmarkStatus.blockedUntil && new Date(benchmarkStatus.blockedUntil) > new Date());
              const hasOpenAttempt = isRegistered && (challenge.is_benchmark ? benchmarkStatus.registrationStatus === "registered" : true);
              if (cooldownActive || !hasOpenAttempt) return null;
              return (
                <>
                  {/* Result Entry Form */}
                  {user && registrationId && (
                    <div className="challenge-card">
                      <ResultEntryForm
                        registrationId={registrationId}
                        challengeSlug={challenge.slug}
                        challengeName={challenge.name}
                        existingResult={existingResult}
                        isVerified={isVerified}
                        gender={userGender}
                        isBenchmark={!!challenge.is_benchmark}
                        onSuccess={handleResultSuccess}
                      />
                    </div>
                  )}

                  <div className="challenge-card text-center py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button onClick={() => setActiveTab("leaderboard")}>
                        Zum Leaderboard
                      </Button>
                      {user && !isVerified && (
                        <Button
                          variant="outline"
                          onClick={handleUnregister}
                          disabled={unregistering}
                          className="text-destructive hover:text-destructive"
                        >
                          {unregistering ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <LogOut className="w-4 h-4 mr-2" />
                          )}
                          Abmelden
                        </Button>
                      )}
                    </div>
                    {isVerified && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Dein Ergebnis wurde verifiziert und kann nicht mehr gelöscht werden.
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="leaderboard">
            <div className="challenge-card">
              <h2 className="text-xl font-semibold mb-6">Leaderboard</h2>
              {user ? (
                <Leaderboard challengeId={challenge.id} challengeSlug={challenge.slug} />
              ) : (
                <div className="text-center py-12">
                  <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Anmeldung erforderlich</h3>
                  <p className="text-muted-foreground mb-4">
                    Melde dich an, um das Leaderboard einzusehen.
                  </p>
                  <Link to="/auth">
                    <Button>Anmelden</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
};

export default ChallengePage;
