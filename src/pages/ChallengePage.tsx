import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RegistrationForm } from "@/components/RegistrationForm";
import { Leaderboard } from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Dumbbell, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Challenge {
  id: string;
  slug: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
}

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
        
        // Check if already registered
        const registeredChallenges = JSON.parse(localStorage.getItem("registeredChallenges") || "{}");
        if (registeredChallenges[data.id]) {
          setIsRegistered(true);
          setActiveTab("leaderboard");
        }
      }
      setLoading(false);
    };

    fetchChallenge();
  }, [slug]);

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
    setActiveTab("leaderboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Dumbbell className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold tracking-tight">Team Tarek</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Alle Challenges
        </Link>

        {/* Challenge Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`challenge-badge ${isActive ? 'challenge-badge-active' : ''}`}>
              {isActive ? "AKTIV" : isUpcoming ? "BALD" : "BEENDET"}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{challenge.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground font-mono">
            <Calendar className="w-5 h-5" />
            {formatDateRange(challenge.start_date, challenge.end_date)}
          </div>
        </div>

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
                <RegistrationForm
                  challengeId={challenge.id}
                  challengeName={challenge.name}
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
              <Leaderboard challengeId={challenge.id} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container">
          <p className="text-sm text-muted-foreground text-center">
            © 2026 Team Tarek. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChallengePage;
