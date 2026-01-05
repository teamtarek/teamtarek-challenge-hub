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
  murph_version: string | null;
  year: number | null;
  created_at: string;
}

// Helper functions for time conversion
const secondsToTimeString = (seconds: number | null): string => {
  if (!seconds || seconds === 0) return "";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const timeStringToSeconds = (timeStr: string): number => {
  if (!timeStr.trim()) return 0;
  const parts = timeStr.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(timeStr, 10) || 0;
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedVersion, setSelectedVersion] = useState<string>("all");
  
  // New participant form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [newParticipantTime, setNewParticipantTime] = useState("");
  const [newParticipantYear, setNewParticipantYear] = useState(new Date().getFullYear().toString());
  const [newParticipantVersion, setNewParticipantVersion] = useState("Standard");
  const [addingParticipant, setAddingParticipant] = useState(false);

  const murphVersions = ["Standard", "Female Version", "Beginner Version"];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

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

    let query = supabase
      .from("registrations")
      .select("id, participant_name, email, score, murph_version, year, created_at")
      .eq("challenge_id", selectedChallenge);

    if (selectedYear !== "all") {
      query = query.eq("year", parseInt(selectedYear, 10));
    }
    if (selectedVersion !== "all") {
      query = query.eq("murph_version", selectedVersion);
    }

    const { data, error } = await query
      .order("score", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRegistrations(data);
      const initialTimes: Record<string, string> = {};
      data.forEach((reg) => {
        initialTimes[reg.id] = secondsToTimeString(reg.score);
      });
      setTimes(initialTimes);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [selectedChallenge, selectedYear, selectedVersion]);

  const handleTimeChange = (registrationId: string, value: string) => {
    setTimes((prev) => ({
      ...prev,
      [registrationId]: value,
    }));
  };

  const handleSaveTime = async (registrationId: string) => {
    setSaving(registrationId);
    const seconds = timeStringToSeconds(times[registrationId] || "");

    const { error } = await supabase
      .from("registrations")
      .update({ score: seconds })
      .eq("id", registrationId);

    if (error) {
      toast.error("Fehler beim Speichern der Zeit");
    } else {
      toast.success("Zeit gespeichert");
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
      score: timeStringToSeconds(newParticipantTime),
      year: parseInt(newParticipantYear, 10),
      murph_version: newParticipantVersion,
      user_id: null,
    });

    if (error) {
      toast.error("Fehler beim Hinzufügen des Teilnehmers");
      console.error(error);
    } else {
      toast.success("Teilnehmer hinzugefügt");
      setNewParticipantName("");
      setNewParticipantEmail("");
      setNewParticipantTime("");
      setNewParticipantYear(new Date().getFullYear().toString());
      setNewParticipantVersion("Standard");
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

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Jahr</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Jahr" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Murph Version</Label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {murphVersions.map((version) => (
                    <SelectItem key={version} value={version}>
                      {version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Teilnehmer & Zeiten</h2>
              
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
                      <Label htmlFor="time">Zeit (MM:SS oder H:MM:SS)</Label>
                      <Input
                        id="time"
                        placeholder="45:30"
                        value={newParticipantTime}
                        onChange={(e) => setNewParticipantTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Jahr</Label>
                      <Select value={newParticipantYear} onValueChange={setNewParticipantYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Jahr" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="version">Murph Version</Label>
                      <Select value={newParticipantVersion} onValueChange={setNewParticipantVersion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Version" />
                        </SelectTrigger>
                        <SelectContent>
                          {murphVersions.map((version) => (
                            <SelectItem key={version} value={version}>
                              {version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-secondary rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {registration.participant_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {registration.email}
                      </p>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{registration.year}</span>
                        <span>•</span>
                        <span>{registration.murph_version || "Standard"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="MM:SS"
                        className="w-28"
                        value={times[registration.id] || ""}
                        onChange={(e) =>
                          handleTimeChange(registration.id, e.target.value)
                        }
                      />
                      <span className="text-muted-foreground text-sm">Zeit</span>
                      <Button
                        size="sm"
                        onClick={() => handleSaveTime(registration.id)}
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
