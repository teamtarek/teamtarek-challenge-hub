import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Header } from "@/components/Header";

interface Challenge {
  id: string;
  slug: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
}

const Index = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("start_date", { ascending: true });

      if (!error && data) {
        setChallenges(data);
      }
      setLoading(false);
    };

    fetchChallenges();
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="container py-16 md:py-24">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 max-w-3xl">
          The Team Tarek
          <br />
          <span className="text-primary">Challenges</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          Fordere dich selbst heraus. Werde Teil der Community.
          Erreiche deine Ziele gemeinsam mit uns.
        </p>
      </section>

      {/* Challenges Grid */}
      <section className="container pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">Challenges 2026</h2>
          <span className="text-sm text-muted-foreground font-mono">
            {challenges.length} Challenges
          </span>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-card animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((challenge, index) => (
              <ChallengeCard
                key={challenge.id}
                slug={challenge.slug}
                name={challenge.name}
                description={challenge.description || ""}
                startDate={challenge.start_date}
                endDate={challenge.end_date}
                index={index}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <p className="text-sm text-muted-foreground text-center">
            © 2026 Team Tarek. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
