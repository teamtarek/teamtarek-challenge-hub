import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Header } from "@/components/Header";
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

      {/* Hero with background image */}
      <section 
        className="relative min-h-[80vh] flex items-center justify-center"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />
        
        {/* Content */}
        <div className="relative z-10 container text-center py-16 md:py-24">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
            The Team Tarek
            <br />
            Challenges
          </h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto">
            Fordere dich selbst heraus. Werde Teil der Community.
            Erreiche deine Ziele gemeinsam mit uns.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-foreground/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Outdoor Community Challenges */}
      <section className="container py-24">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold">Outdoor Community Challenges</h2>
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            {challenges.filter(c => c.category === 'outdoor').length} Challenges
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-48 bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {challenges
              .filter(c => c.category === 'outdoor')
              .map((challenge, index) => (
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

      {/* Gym Community Challenges */}
      <section className="container py-24 pt-0">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold">Gym Community Challenges</h2>
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            {challenges.filter(c => c.category === 'gym').length} Challenges
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {challenges
              .filter(c => c.category === 'gym')
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              .map((challenge, index) => (
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

      {/* Benchmark Workouts - Gym */}
      <section className="container py-24 pt-0">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold">Benchmark Workouts - Gym</h2>
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            {challenges.filter(c => c.category === 'gym-benchmark').length} Challenges
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(1)].map((_, i) => (
              <div key={i} className="h-48 bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {challenges
              .filter(c => c.category === 'gym-benchmark')
              .sort((a, b) => a.name.localeCompare(b.name, 'de'))
              .map((challenge, index) => (
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

      {/* Benchmark Workouts - Kettlebell */}
      <section className="container py-24 pt-0">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold">Benchmark Workouts - Kettlebell</h2>
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            {challenges.filter(c => c.category === 'kettlebell').length} Challenges
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
            {challenges
              .filter(c => c.category === 'kettlebell')
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              .map((challenge, index) => (
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

      {/* Benchmark Workouts - Endurance */}
      <section className="container py-24 pt-0">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold">Benchmark Workouts - Endurance</h2>
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            {challenges.filter(c => c.category === 'endurance').length} Challenges
          </span>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(1)].map((_, i) => (
              <div key={i} className="h-48 bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {challenges
              .filter(c => c.category === 'endurance')
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
              .map((challenge, index) => (
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
          <p className="text-sm text-muted-foreground text-center uppercase tracking-wider">
            © 2026 Team Tarek. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
