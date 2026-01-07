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
import { Shield, Save, Loader2, Plus, UserPlus, CheckCircle, Video, ExternalLink, User, Dumbbell, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Search, Trash2, UserX, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminRoleManager } from "@/components/AdminRoleManager";

interface Challenge {
  id: string;
  name: string;
  slug: string;
  category: string;
}

interface Registration {
  id: string;
  participant_name: string;
  email: string;
  score: number | null;
  murph_version: string | null;
  year: number | null;
  created_at: string;
  validation_type: string | null;
  video_url: string | null;
  is_verified: boolean;
  kettlebell_weight_kg: number | null;
  total_time_seconds: number | null;
  completion_date: string | null;
  total_reps: number | null;
  user_id: string | null;
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

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isWebmaster, loading: adminLoading } = useIsAdmin();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [kettlebellWeights, setKettlebellWeights] = useState<Record<string, string>>({});
  const [totalTimes, setTotalTimes] = useState<Record<string, string>>({});
  const [totalReps, setTotalReps] = useState<Record<string, string>>({});
  const [completionDates, setCompletionDates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedVersion, setSelectedVersion] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "result">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  
  // New participant form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [useExistingParticipant, setUseExistingParticipant] = useState(false);
  const [selectedExistingParticipant, setSelectedExistingParticipant] = useState<string>("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [newParticipantValue, setNewParticipantValue] = useState("");
  const [newParticipantYear, setNewParticipantYear] = useState(new Date().getFullYear().toString());
  const [newParticipantVersion, setNewParticipantVersion] = useState("Standard");
  const [newParticipantKettlebellWeight, setNewParticipantKettlebellWeight] = useState("");
  const [newParticipantTotalTime, setNewParticipantTotalTime] = useState("");
  const [newParticipantTotalReps, setNewParticipantTotalReps] = useState("");
  const [newParticipantCompletionDate, setNewParticipantCompletionDate] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [existingParticipants, setExistingParticipants] = useState<{ email: string; participant_name: string }[]>([]);

  // Link user dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [linkingUser, setLinkingUser] = useState(false);

  const murphVersions = ["Standard", "Female Version", "Beginner Version"];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Check challenge type
  const selectedChallengeData = challenges.find((c) => c.id === selectedChallenge);
  const isMurphChallenge = selectedChallengeData?.slug?.toLowerCase().includes("murph") || 
                           selectedChallengeData?.name?.toLowerCase().includes("murph");
  const isSnatchTest = selectedChallengeData?.slug === "5-minute-snatch-test";
  const isSimpleSinister = selectedChallengeData?.slug === "simple-sinister";
  const isRiteOfPassage = selectedChallengeData?.slug === "rite-of-passage";
  const isKettlebellChallenge = isSnatchTest || isSimpleSinister || isRiteOfPassage;

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
        .select("id, name, slug, category")
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

  // Fetch unique participants for the selected challenge (for adding results to existing participants)
  const fetchExistingParticipants = async () => {
    if (!selectedChallenge) return;
    
    const { data, error } = await supabase
      .from("registrations")
      .select("email, participant_name")
      .eq("challenge_id", selectedChallenge);
    
    if (!error && data) {
      // Get unique participants by email
      const uniqueParticipants = Array.from(
        new Map(data.map((p) => [p.email, p])).values()
      );
      setExistingParticipants(uniqueParticipants);
    }
  };

  useEffect(() => {
    fetchExistingParticipants();
  }, [selectedChallenge]);

  const fetchRegistrations = async () => {
    if (!selectedChallenge) return;

    let query = supabase
      .from("registrations")
      .select("id, participant_name, email, score, murph_version, year, created_at, validation_type, video_url, is_verified, kettlebell_weight_kg, total_time_seconds, completion_date, total_reps, user_id")
      .eq("challenge_id", selectedChallenge);

    if (selectedYear !== "all") {
      query = query.eq("year", parseInt(selectedYear, 10));
    }
    if (selectedVersion !== "all" && isMurphChallenge) {
      query = query.eq("murph_version", selectedVersion);
    }

    const { data, error } = await query
      .order("score", { ascending: isMurphChallenge, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRegistrations(data);
      const initialValues: Record<string, string> = {};
      const initialWeights: Record<string, string> = {};
      const initialTimes: Record<string, string> = {};
      const initialReps: Record<string, string> = {};
      const initialDates: Record<string, string> = {};
      
      data.forEach((reg) => {
        if (isMurphChallenge) {
          initialValues[reg.id] = secondsToTimeString(reg.score);
        } else if (isSimpleSinister) {
          initialValues[reg.id] = secondsToTimeString(reg.score);
        } else {
          initialValues[reg.id] = reg.score?.toString() ?? "0";
        }
        initialWeights[reg.id] = reg.kettlebell_weight_kg?.toString() ?? "";
        initialTimes[reg.id] = secondsToTimeString(reg.total_time_seconds);
        initialReps[reg.id] = reg.total_reps?.toString() ?? "";
        initialDates[reg.id] = reg.completion_date ?? "";
      });
      setValues(initialValues);
      setKettlebellWeights(initialWeights);
      setTotalTimes(initialTimes);
      setTotalReps(initialReps);
      setCompletionDates(initialDates);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [selectedChallenge, selectedYear, selectedVersion]);

  const handleValueChange = (registrationId: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [registrationId]: value,
    }));
  };

  const handleSaveValue = async (registrationId: string) => {
    setSaving(registrationId);
    
    const updateData: any = {};
    
    if (isMurphChallenge || isSimpleSinister) {
      updateData.score = timeStringToSeconds(values[registrationId] || "");
    } else if (!isKettlebellChallenge) {
      updateData.score = parseInt(values[registrationId] || "0", 10);
    }
    
    // Kettlebell specific fields
    if (isKettlebellChallenge) {
      const weight = kettlebellWeights[registrationId];
      if (weight) {
        updateData.kettlebell_weight_kg = parseInt(weight, 10);
      }
      
      const date = completionDates[registrationId];
      if (date) {
        updateData.completion_date = date;
      }
    }
    
    if (isSnatchTest) {
      const reps = totalReps[registrationId];
      if (reps) {
        updateData.total_reps = parseInt(reps, 10);
      }
    }
    
    if (isRiteOfPassage) {
      const time = totalTimes[registrationId];
      if (time) {
        updateData.total_time_seconds = timeStringToSeconds(time);
      }
    }
    
    if (isSimpleSinister) {
      updateData.score = timeStringToSeconds(values[registrationId] || "");
    }

    const { error } = await supabase
      .from("registrations")
      .update(updateData)
      .eq("id", registrationId);

    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Ergebnis gespeichert");
      await fetchRegistrations();
    }
    setSaving(null);
  };

  const handleToggleVerified = async (registrationId: string, currentStatus: boolean) => {
    setVerifying(registrationId);
    
    const { error } = await supabase
      .from("registrations")
      .update({ is_verified: !currentStatus })
      .eq("id", registrationId);

    if (error) {
      toast.error("Fehler beim Aktualisieren des Verifizierungsstatus");
    } else {
      toast.success(currentStatus ? "Verifizierung aufgehoben" : "Ergebnis verifiziert");
      await fetchRegistrations();
    }
    setVerifying(null);
  };

  const handleDeleteRegistration = async (registrationId: string) => {
    if (!confirm("Möchtest du diesen Eintrag wirklich löschen?")) return;
    
    setDeleting(registrationId);
    
    const { error } = await supabase
      .from("registrations")
      .delete()
      .eq("id", registrationId);

    if (error) {
      toast.error("Fehler beim Löschen");
    } else {
      toast.success("Eintrag gelöscht");
      await fetchRegistrations();
    }
    setDeleting(null);
  };

  const handleSearchUsers = async (query: string) => {
    setUserSearchQuery(query);
    if (query.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    
    setSearchingUsers(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .or(`display_name.ilike.%${query}%`)
      .limit(10);
    
    if (!error && data) {
      setUserSearchResults(data);
    }
    setSearchingUsers(false);
  };

  const handleLinkUser = async (registrationId: string, userId: string) => {
    setLinkingUser(true);
    
    const { error } = await supabase
      .from("registrations")
      .update({ user_id: userId })
      .eq("id", registrationId);
    
    if (error) {
      toast.error("Fehler beim Verknüpfen");
    } else {
      toast.success("Account erfolgreich verknüpft");
      await fetchRegistrations();
    }
    
    setLinkDialogOpen(null);
    setUserSearchQuery("");
    setUserSearchResults([]);
    setLinkingUser(false);
  };

  const handleUnlinkUser = async (registrationId: string) => {
    if (!confirm("Möchtest du die Verknüpfung wirklich aufheben?")) return;
    
    const { error } = await supabase
      .from("registrations")
      .update({ user_id: null })
      .eq("id", registrationId);
    
    if (error) {
      toast.error("Fehler beim Aufheben der Verknüpfung");
    } else {
      toast.success("Verknüpfung aufgehoben");
      await fetchRegistrations();
    }
  };

  const handleAddParticipant = async () => {
    let participantName = newParticipantName.trim();
    let participantEmail = newParticipantEmail.trim();
    
    // If using existing participant, get their data
    if (useExistingParticipant && selectedExistingParticipant) {
      const existing = existingParticipants.find((p) => p.email === selectedExistingParticipant);
      if (existing) {
        participantName = existing.participant_name;
        participantEmail = existing.email;
      }
    }
    
    if (!participantName || !participantEmail) {
      toast.error("Name und E-Mail sind erforderlich");
      return;
    }

    // Check if this participant already has a result for this year
    const yearToCheck = parseInt(newParticipantYear, 10);
    const { data: existingResult } = await supabase
      .from("registrations")
      .select("id")
      .eq("challenge_id", selectedChallenge)
      .eq("email", participantEmail)
      .eq("year", yearToCheck)
      .maybeSingle();
    
    if (existingResult) {
      toast.error(`Dieser Teilnehmer hat bereits ein Ergebnis für ${yearToCheck}`);
      return;
    }

    setAddingParticipant(true);

    const insertData: any = {
      challenge_id: selectedChallenge,
      participant_name: participantName,
      email: participantEmail,
      user_id: null,
      year: yearToCheck,
    };

    if (isMurphChallenge) {
      insertData.score = timeStringToSeconds(newParticipantValue);
      insertData.murph_version = newParticipantVersion;
    } else if (isSimpleSinister) {
      insertData.score = timeStringToSeconds(newParticipantValue);
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
      insertData.completion_date = newParticipantCompletionDate || null;
    } else if (isSnatchTest) {
      insertData.total_reps = newParticipantTotalReps ? parseInt(newParticipantTotalReps, 10) : null;
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
      insertData.completion_date = newParticipantCompletionDate || null;
    } else if (isRiteOfPassage) {
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
      insertData.total_time_seconds = timeStringToSeconds(newParticipantTotalTime);
      insertData.completion_date = newParticipantCompletionDate || null;
    } else {
      insertData.score = parseInt(newParticipantValue || "0", 10);
    }

    const { error } = await supabase.from("registrations").insert(insertData);

    if (error) {
      toast.error("Fehler beim Hinzufügen des Teilnehmers");
      console.error(error);
    } else {
      toast.success("Ergebnis hinzugefügt");
      setNewParticipantName("");
      setNewParticipantEmail("");
      setNewParticipantValue("");
      setNewParticipantYear(new Date().getFullYear().toString());
      setNewParticipantVersion("Standard");
      setNewParticipantKettlebellWeight("");
      setNewParticipantTotalTime("");
      setNewParticipantTotalReps("");
      setNewParticipantCompletionDate("");
      setUseExistingParticipant(false);
      setSelectedExistingParticipant("");
      setDialogOpen(false);
      await fetchRegistrations();
      await fetchExistingParticipants();
    }

    setAddingParticipant(false);
  };

  const getResultLabel = () => {
    if (isMurphChallenge || isSimpleSinister) return "Zeiten";
    if (isSnatchTest) return "Wiederholungen";
    if (isRiteOfPassage) return "Ergebnisse";
    return "Punktzahlen";
  };

  // Filter and sort registrations
  const getFilteredAndSortedRegistrations = () => {
    // First filter by search query
    const filtered = registrations.filter((reg) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        reg.participant_name.toLowerCase().includes(query) ||
        reg.email.toLowerCase().includes(query)
      );
    });

    // Then sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.participant_name.localeCompare(b.participant_name, "de");
          break;
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "result":
          // Different result fields based on challenge type
          if (isSnatchTest) {
            comparison = (a.total_reps || 0) - (b.total_reps || 0);
          } else if (isRiteOfPassage) {
            // First by weight, then by time
            const weightDiff = (a.kettlebell_weight_kg || 0) - (b.kettlebell_weight_kg || 0);
            if (weightDiff !== 0) {
              comparison = weightDiff;
            } else {
              comparison = (a.total_time_seconds || 0) - (b.total_time_seconds || 0);
            }
          } else if (isSimpleSinister) {
            // First by weight, then by time
            const weightDiff = (a.kettlebell_weight_kg || 0) - (b.kettlebell_weight_kg || 0);
            if (weightDiff !== 0) {
              comparison = weightDiff;
            } else {
              comparison = (a.score || 0) - (b.score || 0);
            }
          } else {
            comparison = (a.score || 0) - (b.score || 0);
          }
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  };

  const sortedRegistrations = getFilteredAndSortedRegistrations();

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

          {/* Admin Role Manager - nur für Webmaster */}
          {isWebmaster && <AdminRoleManager />}

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
                    {challenge.category === "kettlebell" && (
                      <span className="ml-2 text-xs text-muted-foreground">(Kettlebell)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search, Filters & Sorting */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[200px] max-w-sm">
              <Label>Suche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Name oder E-Mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
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
            {isMurphChallenge && (
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
            )}
            
            {/* Sorting Controls */}
            <div className="space-y-2">
              <Label>Sortieren nach</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "date" | "result")}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Sortieren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Datum</SelectItem>
                  <SelectItem value="result">Ergebnis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              title={sortDirection === "asc" ? "Aufsteigend" : "Absteigend"}
            >
              {sortDirection === "asc" ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Teilnehmer & {getResultLabel()}</h2>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedChallenge}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Teilnehmer hinzufügen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Ergebnis hinzufügen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {/* Toggle for new vs existing participant */}
                    {existingParticipants.length > 0 && (
                      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!useExistingParticipant}
                            onChange={() => {
                              setUseExistingParticipant(false);
                              setSelectedExistingParticipant("");
                            }}
                            className="w-4 h-4"
                          />
                          Neuer Teilnehmer
                        </Label>
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={useExistingParticipant}
                            onChange={() => setUseExistingParticipant(true)}
                            className="w-4 h-4"
                          />
                          Bestehender Teilnehmer
                        </Label>
                      </div>
                    )}

                    {useExistingParticipant ? (
                      <div className="space-y-2">
                        <Label>Teilnehmer auswählen *</Label>
                        <Select
                          value={selectedExistingParticipant}
                          onValueChange={setSelectedExistingParticipant}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Teilnehmer auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {existingParticipants.map((p) => (
                              <SelectItem key={p.email} value={p.email}>
                                {p.participant_name} ({p.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                    
                    {/* Challenge-specific fields */}
                    {isKettlebellChallenge && (
                      <div className="space-y-2">
                        <Label htmlFor="kettlebellWeight">Kettlebell Gewicht (kg)</Label>
                        <Input
                          id="kettlebellWeight"
                          type="number"
                          placeholder="z.B. 24"
                          value={newParticipantKettlebellWeight}
                          onChange={(e) => setNewParticipantKettlebellWeight(e.target.value)}
                          min={4}
                          max={92}
                        />
                      </div>
                    )}
                    
                    {isSnatchTest && (
                      <div className="space-y-2">
                        <Label htmlFor="totalReps">Wiederholungen gesamt</Label>
                        <Input
                          id="totalReps"
                          type="number"
                          placeholder="z.B. 100"
                          value={newParticipantTotalReps}
                          onChange={(e) => setNewParticipantTotalReps(e.target.value)}
                          min={0}
                        />
                      </div>
                    )}
                    
                    {isRiteOfPassage && (
                      <div className="space-y-2">
                        <Label htmlFor="totalTime">Gesamtzeit (MM:SS oder H:MM:SS)</Label>
                        <Input
                          id="totalTime"
                          type="text"
                          placeholder="45:30"
                          value={newParticipantTotalTime}
                          onChange={(e) => setNewParticipantTotalTime(e.target.value)}
                        />
                      </div>
                    )}
                    
                    {isSimpleSinister && (
                      <div className="space-y-2">
                        <Label htmlFor="value">Zeit (MM:SS)</Label>
                        <Input
                          id="value"
                          placeholder="20:00"
                          type="text"
                          value={newParticipantValue}
                          onChange={(e) => setNewParticipantValue(e.target.value)}
                        />
                      </div>
                    )}
                    
                    {isKettlebellChallenge && (
                      <div className="space-y-2">
                        <Label htmlFor="completionDate">Datum</Label>
                        <Input
                          id="completionDate"
                          type="date"
                          value={newParticipantCompletionDate}
                          onChange={(e) => setNewParticipantCompletionDate(e.target.value)}
                        />
                      </div>
                    )}
                    
                    {!isKettlebellChallenge && (
                      <div className="space-y-2">
                        <Label htmlFor="value">{isMurphChallenge ? "Zeit (MM:SS oder H:MM:SS)" : "Punktzahl"}</Label>
                        <Input
                          id="value"
                          placeholder={isMurphChallenge ? "45:30" : "0"}
                          type={isMurphChallenge ? "text" : "number"}
                          min={isMurphChallenge ? undefined : 0}
                          value={newParticipantValue}
                          onChange={(e) => setNewParticipantValue(e.target.value)}
                        />
                      </div>
                    )}
                    
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
                    {isMurphChallenge && (
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
                    )}
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

            {sortedRegistrations.length === 0 ? (
              <p className="text-muted-foreground">
                Keine Teilnehmer für diese Challenge.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedRegistrations.map((registration) => (
                  <div
                    key={registration.id}
                    className={`flex flex-col gap-4 p-4 rounded-lg ${
                      registration.is_verified ? "bg-green-500/10 border border-green-500/30" : "bg-secondary"
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      {/* Participant Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {registration.participant_name}
                          </p>
                          {registration.is_verified && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {registration.user_id ? (
                            <div className="flex items-center gap-1">
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs" title="Mit Account verknüpft">
                                <LinkIcon className="w-3 h-3" />
                                Verknüpft
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => handleUnlinkUser(registration.id)}
                                title="Verknüpfung aufheben"
                              >
                                <UserX className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Dialog open={linkDialogOpen === registration.id} onOpenChange={(open) => {
                              setLinkDialogOpen(open ? registration.id : null);
                              if (!open) {
                                setUserSearchQuery("");
                                setUserSearchResults([]);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                >
                                  <UserX className="w-3 h-3 mr-1" />
                                  Nicht verknüpft – Jetzt verknüpfen
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Account verknüpfen</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <p className="text-sm text-muted-foreground">
                                    Registrierung von <strong>{registration.participant_name}</strong> ({registration.email}) mit einem Account verknüpfen:
                                  </p>
                                  <div className="space-y-2">
                                    <Label>Benutzer suchen</Label>
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                      <Input
                                        placeholder="Name eingeben..."
                                        value={userSearchQuery}
                                        onChange={(e) => handleSearchUsers(e.target.value)}
                                        className="pl-9"
                                      />
                                    </div>
                                  </div>
                                  {searchingUsers && (
                                    <div className="flex justify-center py-4">
                                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                  )}
                                  {!searchingUsers && userSearchResults.length > 0 && (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {userSearchResults.map((result) => (
                                        <div
                                          key={result.user_id}
                                          className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer"
                                          onClick={() => handleLinkUser(registration.id, result.user_id)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-medium">{result.display_name || "Unbenannt"}</span>
                                          </div>
                                          <Button size="sm" disabled={linkingUser}>
                                            {linkingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {!searchingUsers && userSearchQuery.length >= 2 && userSearchResults.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      Keine Benutzer gefunden
                                    </p>
                                  )}
                                  {userSearchQuery.length < 2 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      Mindestens 2 Zeichen eingeben
                                    </p>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {registration.email}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{registration.year}</span>
                          {isMurphChallenge && (
                            <>
                              <span>•</span>
                              <span>{registration.murph_version || "Standard"}</span>
                            </>
                          )}
                          {isKettlebellChallenge && registration.kettlebell_weight_kg && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Dumbbell className="w-3 h-3" />
                                {registration.kettlebell_weight_kg} kg
                              </span>
                            </>
                          )}
                          {registration.completion_date && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(registration.completion_date)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Edit Fields */}
                      <div className="flex flex-wrap items-center gap-3">
                        {isKettlebellChallenge && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="kg"
                              type="number"
                              min={4}
                              max={92}
                              className="w-20"
                              value={kettlebellWeights[registration.id] || ""}
                              onChange={(e) =>
                                setKettlebellWeights((prev) => ({
                                  ...prev,
                                  [registration.id]: e.target.value,
                                }))
                              }
                            />
                            <span className="text-muted-foreground text-sm">kg</span>
                          </div>
                        )}
                        
                        {isSnatchTest && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Reps"
                              type="number"
                              min={0}
                              className="w-24"
                              value={totalReps[registration.id] || ""}
                              onChange={(e) =>
                                setTotalReps((prev) => ({
                                  ...prev,
                                  [registration.id]: e.target.value,
                                }))
                              }
                            />
                            <span className="text-muted-foreground text-sm">Reps</span>
                          </div>
                        )}
                        
                        {isRiteOfPassage && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="MM:SS"
                              type="text"
                              className="w-24"
                              value={totalTimes[registration.id] || ""}
                              onChange={(e) =>
                                setTotalTimes((prev) => ({
                                  ...prev,
                                  [registration.id]: e.target.value,
                                }))
                              }
                            />
                            <span className="text-muted-foreground text-sm">Zeit</span>
                          </div>
                        )}
                        
                        {isSimpleSinister && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="MM:SS"
                              type="text"
                              className="w-24"
                              value={values[registration.id] || ""}
                              onChange={(e) =>
                                handleValueChange(registration.id, e.target.value)
                              }
                            />
                            <span className="text-muted-foreground text-sm">Zeit</span>
                          </div>
                        )}
                        
                        {isKettlebellChallenge && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              className="w-36"
                              value={completionDates[registration.id] || ""}
                              onChange={(e) =>
                                setCompletionDates((prev) => ({
                                  ...prev,
                                  [registration.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}
                        
                        {!isKettlebellChallenge && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder={isMurphChallenge ? "MM:SS" : "0"}
                              type={isMurphChallenge ? "text" : "number"}
                              min={isMurphChallenge ? undefined : 0}
                              className="w-28"
                              value={values[registration.id] || ""}
                              onChange={(e) =>
                                handleValueChange(registration.id, e.target.value)
                              }
                            />
                            <span className="text-muted-foreground text-sm">{isMurphChallenge ? "Zeit" : "Punkte"}</span>
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          onClick={() => handleSaveValue(registration.id)}
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
                    
                    {/* Validation Info & Verification */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
                      <div className="flex items-center gap-3">
                        {registration.validation_type === "video" ? (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs">
                              <Video className="w-3 h-3" />
                              Videobeweis
                            </span>
                            {registration.video_url && (
                              <a
                                href={registration.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Video ansehen
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs">
                            <User className="w-3 h-3" />
                            Coach-Bestätigung
                          </span>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant={registration.is_verified ? "outline" : "default"}
                        onClick={() => handleToggleVerified(registration.id, registration.is_verified)}
                        disabled={verifying === registration.id}
                        className={registration.is_verified ? "border-green-500 text-green-500 hover:bg-green-500/10" : ""}
                      >
                        {verifying === registration.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        {registration.is_verified ? "Verifiziert" : "Als geprüft markieren"}
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