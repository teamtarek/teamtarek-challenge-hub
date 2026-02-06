import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationForm } from "@/components/RegistrationForm";
import { Leaderboard } from "@/components/Leaderboard";
// Header removed - using AppLayout

import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Dumbbell, Users, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
            .select("id")
            .eq("challenge_id", data.id)
            .eq("user_id", user.id)
            .maybeSingle();
          
          if (regData) {
            setIsRegistered(true);
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
    setActiveTab("leaderboard");
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
              <p className="text-muted-foreground leading-relaxed">
                {challenge.description}
              </p>
            </div>

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
              <div className="challenge-card text-center py-8">
                <h2 className="text-xl font-semibold mb-2">Du bist registriert!</h2>
                <p className="text-muted-foreground mb-4">
                  Schau dir das Leaderboard an, um deinen Fortschritt zu verfolgen.
                </p>
                <Button onClick={() => setActiveTab("leaderboard")}>
                  Zum Leaderboard
                </Button>
              </div>
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
