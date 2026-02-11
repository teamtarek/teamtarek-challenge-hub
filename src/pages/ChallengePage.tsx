import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationForm } from "@/components/RegistrationForm";
import { ResultEntryForm } from "@/components/ResultEntryForm";
import { VideoEmbed, isValidVideoUrl } from "@/components/VideoEmbed";
import { Leaderboard } from "@/components/Leaderboard";
// Header removed - using AppLayout

import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Dumbbell, Users, Lock, Zap, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MILE_LEVEL_DESCRIPTIONS, FIVE_K_LEVEL_DESCRIPTIONS, TEN_K_LEVEL_DESCRIPTIONS, COMPLEX_1234_LEVEL_DESCRIPTIONS, MEET_BETTY_LEVEL_DESCRIPTIONS, RITE_OF_PASSAGE_LEVEL_DESCRIPTIONS, SIMPLE_SINISTER_LEVEL_DESCRIPTIONS, QUADRANT_LEVEL_DESCRIPTIONS, SNATCH_TEST_INFO } from "@/lib/mileLevels";

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
import complex1234 from "@/assets/challenges/1234-complex.jpg";
import theQuadrant from "@/assets/challenges/the-quadrant.jpg";
import heroBg from "@/assets/hero-bg.jpg";

interface Challenge {
  id: string;
  slug: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
  category: string;
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
    "1234-complex": complex1234,
    "the-quadrant": theQuadrant,
  };
  return imageMap[slug] || heroBg;
};

// Custom background positions for specific challenges
const getChallengeBackgroundPosition = (slug: string): string => {
  const positionMap: Record<string, string> = {
    "winter-challenge-2026": "center 20%",
    "5-minute-snatch-test": "center top",
    "deadly-dozen": "center top",
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
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [existingResult, setExistingResult] = useState<{
    score: number | null;
    total_time_seconds: number | null;
    total_reps: number | null;
    kettlebell_weight_kg: number | null;
  }>({ score: null, total_time_seconds: null, total_reps: null, kettlebell_weight_kg: null });
  const [unregistering, setUnregistering] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

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
          const { data: regData } = await supabase
            .from("registrations")
            .select("id, is_verified, score, total_time_seconds, total_reps, kettlebell_weight_kg")
            .eq("challenge_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();
          
          if (regData) {
            setIsRegistered(true);
            setRegistrationId(regData.id);
            setIsVerified(regData.is_verified ?? false);
            setExistingResult({
              score: regData.score,
              total_time_seconds: regData.total_time_seconds,
              total_reps: regData.total_reps,
              kettlebell_weight_kg: regData.kettlebell_weight_kg,
            });
            setActiveTab("leaderboard");
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
    const { data: regData } = await supabase
      .from("registrations")
      .select("id, is_verified, score, total_time_seconds, total_reps, kettlebell_weight_kg")
      .eq("challenge_id", challenge.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (regData) {
      setIsVerified(regData.is_verified ?? false);
      setExistingResult({
        score: regData.score,
        total_time_seconds: regData.total_time_seconds,
        total_reps: regData.total_reps,
        kettlebell_weight_kg: regData.kettlebell_weight_kg,
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
  const end = challenge.end_date ? new Date(challenge.end_date) : start;
  const isActive = now >= start && now <= end;
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

            {/* Mile Level Info Box */}
            {/* Snatch Test Level Info */}
            {(challenge.slug === "5-minute-snatch-test" || challenge.slug === "secret-service-snatch-test") && (
              <div className="challenge-card">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Level-Info</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {SNATCH_TEST_INFO[challenge.slug as keyof typeof SNATCH_TEST_INFO]}
                </p>
              </div>
            )}

            {(challenge.slug === "the-mile" || challenge.slug === "5-kilometer-run" || challenge.slug === "10-kilometer-run" || challenge.slug === "1234-complex" || challenge.slug === "meet-betty" || challenge.slug === "rite-of-passage" || challenge.slug === "simple-sinister") && (() => {
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
                          : MILE_LEVEL_DESCRIPTIONS;
              const isComplex = challenge.slug === "1234-complex";
              const isBetty = challenge.slug === "meet-betty";
              const isRoP = challenge.slug === "rite-of-passage";
              const isSS = challenge.slug === "simple-sinister";
              return (
                <div className="challenge-card">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Level-Stufen
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isBetty
                      ? "Wähle dein Level basierend auf Übungsvarianten und Gewicht. 5 Runden auf Zeit – Zielzeit: 10 Minuten."
                      : isRoP
                        ? "Wähle dein Level basierend auf Leiter-Struktur und Gewicht."
                        : isSS
                          ? "Wähle dein Level basierend auf dem verwendeten Gewicht. Zielzeit: 20 Minuten."
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

            {/* Registration */}
            {!isRegistered ? (
              <div className="challenge-card">
                <h2 className="text-xl font-semibold mb-4">Jetzt teilnehmen</h2>
                {!user && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <Link to="/auth" className="text-foreground hover:underline">Melde dich an</Link> um deine Fortschritte zu tracken, oder registriere dich als Gast.
                  </p>
                )}
                <RegistrationForm
                  challengeId={challenge.id}
                  challengeName={challenge.name}
                  challengeSlug={challenge.slug}
                  onSuccess={handleRegistrationSuccess}
                />
              </div>
            ) : (
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
            )}
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
