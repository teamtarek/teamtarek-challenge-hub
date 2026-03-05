import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Leaderboard } from "@/components/Leaderboard";
import { Top3Summary } from "@/components/Top3Summary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy } from "lucide-react";
interface Challenge {
  id: string;
  name: string;
  slug: string;
  category: string;
}

const LeaderboardPage = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, name, slug, category")
        .order("start_date", { ascending: false });

      if (!error && data) {
        setChallenges(data);
        if (data.length > 0) setSelectedChallenge(data[0].id);
      }
      setLoading(false);
    };
    fetchChallenges();
  }, []);

  const selectedChallengeData = challenges.find((c) => c.id === selectedChallenge);

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="w-7 h-7 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold">Leaderboard</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Ranglisten aller Challenges. Nur verifizierte Ergebnisse.
      </p>

      <Tabs defaultValue="challenge" className="space-y-6">
        <TabsList>
          <TabsTrigger value="challenge">Pro Challenge</TabsTrigger>
        </TabsList>

        <TabsContent value="challenge" className="space-y-6">
          {loading ? (
            <div className="h-12 bg-card animate-pulse rounded" />
          ) : (
            <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
              <SelectTrigger>
                <SelectValue placeholder="Challenge wählen" />
              </SelectTrigger>
              <SelectContent>
                {challenges.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedChallenge && (
            <div className="bg-card border border-border p-6">
              <Leaderboard
                challengeId={selectedChallenge}
                challengeSlug={selectedChallengeData?.slug}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaderboardPage;
