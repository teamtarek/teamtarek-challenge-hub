import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeCard } from "@/components/ChallengeCard";

interface Challenge {
  id: string;
  slug: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
  category: string;
}

const SECTIONS = [
  { key: "outdoor", label: "Outdoor Community Challenges" },
  { key: "gym", label: "Gym Community Challenges" },
  { key: "kettlebell", label: "Benchmark Workouts — Kettlebell" },
];

const ChallengesPage = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("start_date", { ascending: true });

      if (!error && data) setChallenges(data);
      setLoading(false);
    };
    fetchChallenges();
  }, []);

  return (
    <div className="container py-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">Challenges</h1>
      <p className="text-muted-foreground mb-10">
        Melde dich an, trainiere und reiche dein Ergebnis ein.
      </p>

      {SECTIONS.map((section) => {
        const sectionChallenges = challenges.filter((c) => c.category === section.key);
        if (!loading && sectionChallenges.length === 0) return null;

        return (
          <section key={section.key} className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{section.label}</h2>
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                {sectionChallenges.length} Challenges
              </span>
            </div>

            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-48 bg-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sectionChallenges.map((challenge, index) => (
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
        );
      })}
    </div>
  );
};

export default ChallengesPage;
