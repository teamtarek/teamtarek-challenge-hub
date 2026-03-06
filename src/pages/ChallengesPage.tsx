import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChallengeCard } from "@/components/ChallengeCard";
import { CHALLENGE_SECTIONS } from "@/lib/challengeCategories";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Challenge {
  id: string;
  slug: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
  category: string;
}

const ChallengesPage = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("name", { ascending: true });

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

      <Accordion type="multiple">
        {CHALLENGE_SECTIONS.map((section) => {
          const sectionChallenges = challenges
            .filter((c) => c.category === section.key)
            .sort((a, b) => a.name.localeCompare(b.name, "de"));
          if (!loading && sectionChallenges.length === 0) return null;

          return (
            <AccordionItem key={section.key} value={section.key} className="border-b border-border mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{section.label}</h2>
                  <span className="text-sm text-muted-foreground uppercase tracking-wider">
                    {sectionChallenges.length}
                  </span>
                </div>
                <AccordionTrigger className="py-4 hover:no-underline" />
              </div>

              {/* Collapsed: list of challenge names - hidden when open via CSS */}
              <div className="accordion-hide-when-open pb-4">
                <ul className="space-y-1.5">
                  {loading
                    ? [...Array(3)].map((_, i) => (
                        <li key={i} className="h-5 w-48 bg-muted animate-pulse rounded" />
                      ))
                    : sectionChallenges.map((ch) => (
                        <li key={ch.id}>
                          <Link
                            to={`/challenge/${ch.slug}`}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {ch.name}
                          </Link>
                        </li>
                      ))}
                </ul>
              </div>

              {/* Expanded: full card grid */}
              <AccordionContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-2">
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
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default ChallengesPage;
