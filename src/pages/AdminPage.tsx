import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Save, Loader2, Plus, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Challenge {
  id: string;
  name: string;
  slug: string;
}

interface Registration {
  id: string;
  participant_name: string;
  email: string;
  score: number | null;
  created_at: string;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  
  // New participant form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [newParticipantScore, setNewParticipantScore] = useState("0");
  const [addingParticipant, setAddingParticipant] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast.error("Keine Berechtigung für diese Seite");
      navigate("/");
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    const fetchChallenges = async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, name, slug")
        .order("start_date", { ascending: false });

      if (!error && data) {
        setChallenges(data);
        if (data.length > 0) {
          setSelectedChallenge(data[0].id);
        }
      }
      setLoadingData(false);
    };

    if (isAdmin) {
      fetchChallenges();
    }
  }, [isAdmin]);

  const fetchRegistrations = async () => {
    if (!selectedChallenge) return;

    const { data, error } = await supabase
      .from("registrations")
      .select("id, participant_name, email, score, created_at")
      .eq("challenge_id", selectedChallenge)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRegistrations(data);
      const initialScores: Record<string, string> = {};
      data.forEach((reg) => {
        initialScores[reg.id] = reg.score?.toString() ?? "0";
      });
      setScores(initialScores);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [selectedChallenge]);

  const handleScoreChange = (registrationId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [registrationId]: value,
    }));
  };

  const handleSaveScore = async (registrationId: string) => {
    setSaving(registrationId);
    const newScore = parseInt(scores[registrationId] || "0", 10);

    const { error } = await supabase
      .from("registrations")
      .update({ score: newScore })
      .eq("id", registrationId);

    if (error) {
      toast.error("Fehler beim Speichern der Punktzahl");
    } else {
      toast.success("Punktzahl gespeichert");
      await fetchRegistrations();
    }
    setSaving(null);
  };

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim() || !newParticipantEmail.trim()) {
      toast.error("Name und E-Mail sind erforderlich");
      return;
    }

    setAddingParticipant(true);

    const { error } = await supabase.from("registrations").insert({
      challenge_id: selectedChallenge,
      participant_name: newParticipantName.trim(),
      email: newParticipantEmail.trim(),
      score: parseInt(newParticipantScore || "0", 10),
      user_id: null,
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen des Teilnehmers");
      console.error(error);
    } else {
      toast.success("Teilnehmer hinzugefügt");
      setNewParticipantName("");
      setNewParticipantEmail("");
      setNewParticipantScore("0");
      setDialogOpen(false);
      await fetchRegistrations();
    }

    setAddingParticipant(false);
  };

  if (authLoading || adminLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin-Bereich</h1>
          </div>

          <div className="space-y-4">
            <Label>Challenge auswählen</Label>
            <Select
              value={selectedChallenge}
              onValueChange={setSelectedChallenge}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Challenge auswählen" />
              </SelectTrigger>
              <SelectContent>
                {challenges.map((challenge) => (
                  <SelectItem key={challenge.id} value={challenge.id}>
                    {challenge.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Teilnehmer & Punktzahlen</h2>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedChallenge}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Teilnehmer hinzufügen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neuen Teilnehmer hinzufügen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        placeholder="Max Mustermann"
                        value={newParticipantName}
                        onChange={(e) => setNewParticipantName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-Mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="max@beispiel.de"
                        value={newParticipantEmail}
                        onChange={(e) => setNewParticipantEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="score">Punktzahl</Label>
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        value={newParticipantScore}
                        onChange={(e) => setNewParticipantScore(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleAddParticipant}
                      disabled={addingParticipant}
                    >
                      {addingParticipant ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Hinzufügen
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {registrations.length === 0 ? (
              <p className="text-muted-foreground">
                Keine Teilnehmer für diese Challenge.
              </p>
            ) : (
              <div className="space-y-3">
                {registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center gap-4 p-4 bg-secondary rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {registration.participant_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {registration.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        className="w-24"
                        value={scores[registration.id] || "0"}
                        onChange={(e) =>
                          handleScoreChange(registration.id, e.target.value)
                        }
                      />
                      <span className="text-muted-foreground">Punkte</span>
                      <Button
                        size="sm"
                        onClick={() => handleSaveScore(registration.id)}
                        disabled={saving === registration.id}
                      >
                        {saving === registration.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
