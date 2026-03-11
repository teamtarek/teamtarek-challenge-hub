import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

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
import { AdminMergeNotifications } from "@/components/AdminMergeNotifications";

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
  const { isAdmin, isWebmaster, loading: adminLoading } = useUserRole();
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
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2018 }, (_, i) => currentYear - i);

  // Check challenge type
  const selectedChallengeData = challenges.find((c) => c.id === selectedChallenge);
  const isMurphChallenge = selectedChallengeData?.slug?.toLowerCase().includes("murph") || 
                           selectedChallengeData?.name?.toLowerCase().includes("murph");
  const isSnatchTest = selectedChallengeData?.slug === "5-minute-snatch-test";
  const isSecretServiceSnatchTest = selectedChallengeData?.slug === "secret-service-snatch-test";
  const isSimpleSinister = selectedChallengeData?.slug === "simple-sinister";
  const isRiteOfPassage = selectedChallengeData?.slug === "rite-of-passage";
  const isMeetBetty = selectedChallengeData?.slug === "meet-betty";
  const isTheMile = selectedChallengeData?.slug === "the-mile";
  const is5k = selectedChallengeData?.slug === "5-kilometer-run";
  const is10k = selectedChallengeData?.slug === "10-kilometer-run";
  const isEnduranceRun = isTheMile || is5k || is10k;
  const isKettlebellSwing = selectedChallengeData?.slug === "kettlebell-swing";
  const isSpringChallenge = selectedChallengeData?.slug === "spring-challenge-2026";
  const is10RoundsOfPain = selectedChallengeData?.slug === "10-rounds-of-pain";
  const is1234Complex = selectedChallengeData?.slug === "1234-complex";
  const isClassicComplex = selectedChallengeData?.slug === "the-classic-complex";
  const isTheQuadrant = selectedChallengeData?.slug === "the-quadrant";
  const isAnySnatchTest = isSnatchTest; // Only 5-min uses reps
  const isKettlebellChallenge = isSnatchTest || isSimpleSinister || isRiteOfPassage || isMeetBetty;
  const isTimeChallenge = isEnduranceRun || isMeetBetty || isSpringChallenge || isSecretServiceSnatchTest;

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
        } else if (isKettlebellSwing) {
          initialValues[reg.id] = reg.score === 1 ? "pass" : "fail";
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
    
    if (isMurphChallenge) {
      updateData.score = timeStringToSeconds(values[registrationId] || "");
    } else if (isSimpleSinister) {
      updateData.score = timeStringToSeconds(values[registrationId] || "");
    } else if (isKettlebellSwing) {
      updateData.score = values[registrationId] === "pass" ? 1 : 0;
    }
    // No score for challenges that use other fields
    
    // Weight fields
    if (isKettlebellChallenge || isKettlebellSwing || is10RoundsOfPain || is1234Complex || isClassicComplex || isTheQuadrant || isSecretServiceSnatchTest) {
      const weight = kettlebellWeights[registrationId];
      if (weight) updateData.kettlebell_weight_kg = parseInt(weight, 10);
    }
    
    // Date fields
    if (isKettlebellChallenge || isKettlebellSwing) {
      const date = completionDates[registrationId];
      if (date) updateData.completion_date = date;
    }
    
    // Reps/Rounds fields
    if (isKettlebellSwing || isAnySnatchTest || is1234Complex || isClassicComplex) {
      const reps = totalReps[registrationId];
      if (reps) updateData.total_reps = parseInt(reps, 10);
    }
    
    // Time fields
    if (isRiteOfPassage || isEnduranceRun || isMeetBetty || isSpringChallenge || is10RoundsOfPain || is1234Complex || isTheQuadrant || isSecretServiceSnatchTest) {
      const time = totalTimes[registrationId];
      if (time) updateData.total_time_seconds = timeStringToSeconds(time);
    }
    
    // Default: time-based score for unknown challenges
    if (!isMurphChallenge && !isSimpleSinister && !isKettlebellSwing && !isKettlebellChallenge && !isEnduranceRun && !isSpringChallenge && !is10RoundsOfPain && !is1234Complex && !isClassicComplex && !isTheQuadrant) {
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
    
    if (!participantName) {
      toast.error("Name ist erforderlich");
      return;
    }

    // Generate placeholder email if not provided
    if (!participantEmail) {
      participantEmail = `admin-${crypto.randomUUID().slice(0, 8)}@placeholder.local`;
    }

    // Check if this participant already has a result for this year
    const yearToCheck = parseInt(newParticipantYear, 10);
    if (!participantEmail.includes("@placeholder.local")) {
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
    } else if (isKettlebellSwing) {
      insertData.score = newParticipantValue === "pass" ? 1 : 0;
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
      insertData.total_reps = newParticipantTotalReps ? parseInt(newParticipantTotalReps, 10) : null;
    } else if (isSimpleSinister) {
      insertData.score = timeStringToSeconds(newParticipantValue);
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
      insertData.completion_date = newParticipantCompletionDate || null;
    } else if (isAnySnatchTest) {
      insertData.total_reps = newParticipantTotalReps ? parseInt(newParticipantTotalReps, 10) : null;
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
      insertData.completion_date = newParticipantCompletionDate || null;
    } else if (isSecretServiceSnatchTest) {
      insertData.total_time_seconds = timeStringToSeconds(newParticipantTotalTime);
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
    } else if (isRiteOfPassage) {
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
      insertData.total_time_seconds = timeStringToSeconds(newParticipantTotalTime);
      insertData.completion_date = newParticipantCompletionDate || null;
    } else if (isEnduranceRun || isSpringChallenge) {
      insertData.total_time_seconds = timeStringToSeconds(newParticipantTotalTime);
    } else if (isMeetBetty) {
      insertData.total_time_seconds = timeStringToSeconds(newParticipantTotalTime);
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
    } else if (is1234Complex) {
      insertData.total_reps = newParticipantTotalReps ? parseInt(newParticipantTotalReps, 10) : null;
      insertData.total_time_seconds = timeStringToSeconds(newParticipantTotalTime);
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
    } else if (isClassicComplex) {
      insertData.total_reps = newParticipantTotalReps ? parseInt(newParticipantTotalReps, 10) : null;
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
    } else if (is10RoundsOfPain || isTheQuadrant) {
      insertData.total_time_seconds = timeStringToSeconds(newParticipantTotalTime);
      insertData.kettlebell_weight_kg = newParticipantKettlebellWeight ? parseInt(newParticipantKettlebellWeight, 10) : null;
    } else {
      // Default: time-based
      insertData.score = timeStringToSeconds(newParticipantValue || "");
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
    if (isAnySnatchTest) return "Wiederholungen";
    if (isKettlebellSwing) return "Ergebnisse";
    if (isRiteOfPassage) return "Ergebnisse";
    if (isEnduranceRun || isMeetBetty || isSpringChallenge || is10RoundsOfPain || isTheQuadrant) return "Zeiten";
    if (is1234Complex || isClassicComplex) return "Runden & Gewicht";
    return "Ergebnisse";
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
          if (isKettlebellSwing) {
            // Pass first, then reps, then weight
            const passDiff = (b.score || 0) - (a.score || 0);
            if (passDiff !== 0) { comparison = passDiff; break; }
            const repsDiff = (b.total_reps || 0) - (a.total_reps || 0);
            if (repsDiff !== 0) { comparison = repsDiff; break; }
            comparison = (b.kettlebell_weight_kg || 0) - (a.kettlebell_weight_kg || 0);
          } else if (isAnySnatchTest) {
            comparison = (a.total_reps || 0) - (b.total_reps || 0);
          } else if (isEnduranceRun || isMeetBetty || isSpringChallenge) {
            comparison = (a.total_time_seconds || 0) - (b.total_time_seconds || 0);
          } else if (isRiteOfPassage) {
            const weightDiff = (a.kettlebell_weight_kg || 0) - (b.kettlebell_weight_kg || 0);
            if (weightDiff !== 0) {
              comparison = weightDiff;
            } else {
              comparison = (a.total_time_seconds || 0) - (b.total_time_seconds || 0);
            }
          } else if (isSimpleSinister) {
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

      <main className="container py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin-Bereich</h1>
          </div>

          {/* Admin Role Manager - nur für Webmaster */}
          {isWebmaster && <AdminRoleManager />}

          {/* Merge Notifications */}
          <AdminMergeNotifications />

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
                    {challenge.category === "endurance" && (
                      <span className="ml-2 text-xs text-muted-foreground">(Endurance)</span>
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
                          <Label htmlFor="email">E-Mail (optional)</Label>
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
                    {/* Weight for applicable challenges */}
                    {(isKettlebellChallenge || isKettlebellSwing || is10RoundsOfPain || is1234Complex || isClassicComplex || isTheQuadrant || isSecretServiceSnatchTest) && (
                      <div className="space-y-2">
                        <Label htmlFor="kettlebellWeight">Gewicht (kg)</Label>
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
                    
                    {/* Swing pass/fail + total reps */}
                    {isKettlebellSwing && (
                      <>
                        <div className="space-y-2">
                          <Label>Pass / Fail</Label>
                          <Select value={newParticipantValue || "fail"} onValueChange={setNewParticipantValue}>
                            <SelectTrigger>
                              <SelectValue placeholder="Status wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pass">Pass ✓</SelectItem>
                              <SelectItem value="fail">Fail ✗</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="totalRepsSwing">Gesamtzahl Swings</Label>
                          <Input
                            id="totalRepsSwing"
                            type="number"
                            placeholder="z.B. 10000"
                            value={newParticipantTotalReps}
                            onChange={(e) => setNewParticipantTotalReps(e.target.value)}
                            min={0}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Snatch test reps */}
                    {isAnySnatchTest && (
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
                    
                    {/* Rounds for 1234 Complex, Classic Complex */}
                    {(is1234Complex || isClassicComplex) && (
                      <div className="space-y-2">
                        <Label htmlFor="totalReps">Absolvierte Runden</Label>
                        <Input
                          id="totalReps"
                          type="number"
                          placeholder="z.B. 15"
                          value={newParticipantTotalReps}
                          onChange={(e) => setNewParticipantTotalReps(e.target.value)}
                          min={1}
                        />
                      </div>
                    )}
                    
                    {/* Time for applicable challenges */}
                    {(isRiteOfPassage || isEnduranceRun || isMeetBetty || isSpringChallenge || is10RoundsOfPain || is1234Complex || isTheQuadrant || isSecretServiceSnatchTest) && (
                      <div className="space-y-2">
                        <Label htmlFor="totalTime">Zeit (MM:SS)</Label>
                        <Input
                          id="totalTime"
                          type="text"
                          placeholder="z.B. 25:30"
                          value={newParticipantTotalTime}
                          onChange={(e) => setNewParticipantTotalTime(e.target.value)}
                        />
                      </div>
                    )}
                    
                    {/* Simple Sinister time */}
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
                    
                    {/* Kettlebell date */}
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
                    
                    {/* Murph time */}
                    {isMurphChallenge && (
                      <div className="space-y-2">
                        <Label htmlFor="value">Zeit (MM:SS oder H:MM:SS)</Label>
                        <Input
                          id="value"
                          placeholder="45:30"
                          type="text"
                          value={newParticipantValue}
                          onChange={(e) => setNewParticipantValue(e.target.value)}
                        />
                      </div>
                    )}
                    
                    {/* Default: time-based for other challenges */}
                    {!isKettlebellChallenge && !isEnduranceRun && !isSpringChallenge && !isMurphChallenge && !isKettlebellSwing && !is10RoundsOfPain && !is1234Complex && !isClassicComplex && !isTheQuadrant && (
                      <div className="space-y-2">
                        <Label htmlFor="value">Gesamtzeit (MM:SS)</Label>
                        <Input
                          id="value"
                          placeholder="45:30"
                          type="text"
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
                          {(isKettlebellChallenge || isKettlebellSwing || is10RoundsOfPain || is1234Complex || isClassicComplex || isTheQuadrant || isSecretServiceSnatchTest) && registration.kettlebell_weight_kg && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Dumbbell className="w-3 h-3" />
                                {registration.kettlebell_weight_kg} kg
                              </span>
                            </>
                          )}
                          {(is1234Complex || isClassicComplex) && registration.total_reps && (
                            <>
                              <span>•</span>
                              <span>{registration.total_reps} Runden</span>
                            </>
                          )}
                          {(is10RoundsOfPain || isTheQuadrant || is1234Complex || isSecretServiceSnatchTest) && registration.total_time_seconds && (
                            <>
                              <span>•</span>
                              <span>{secondsToTimeString(registration.total_time_seconds)}</span>
                            </>
                          )}
                          {isKettlebellSwing && (
                            <>
                              <span>•</span>
                              <span>{registration.score === 1 ? "✓ Pass" : "✗ Fail"}</span>
                              {registration.total_reps && (
                                <>
                                  <span>•</span>
                                  <span>{registration.total_reps.toLocaleString()} Swings</span>
                                </>
                              )}
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
                        {/* Weight fields */}
                        {(isKettlebellChallenge || isKettlebellSwing || is10RoundsOfPain || is1234Complex || isClassicComplex || isTheQuadrant || isSecretServiceSnatchTest) && (
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
                        
                        {/* Swing fields */}
                        {isKettlebellSwing && (
                          <>
                            <div className="flex items-center gap-2">
                              <Select
                                value={values[registration.id] || "fail"}
                                onValueChange={(v) => handleValueChange(registration.id, v)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pass">Pass</SelectItem>
                                  <SelectItem value="fail">Fail</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Swings"
                                type="number"
                                min={0}
                                className="w-28"
                                value={totalReps[registration.id] || ""}
                                onChange={(e) =>
                                  setTotalReps((prev) => ({
                                    ...prev,
                                    [registration.id]: e.target.value,
                                  }))
                                }
                              />
                              <span className="text-muted-foreground text-sm">Swings</span>
                            </div>
                          </>
                        )}
                        
                        {/* Reps for snatch tests */}
                        {isAnySnatchTest && (
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
                        
                        {/* Rounds for 1234 Complex, Classic Complex */}
                        {(is1234Complex || isClassicComplex) && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Runden"
                              type="number"
                              min={1}
                              className="w-24"
                              value={totalReps[registration.id] || ""}
                              onChange={(e) =>
                                setTotalReps((prev) => ({
                                  ...prev,
                                  [registration.id]: e.target.value,
                                }))
                              }
                            />
                            <span className="text-muted-foreground text-sm">Runden</span>
                          </div>
                        )}
                        
                        {/* Time fields */}
                        {(isRiteOfPassage || isEnduranceRun || isMeetBetty || isSpringChallenge || is10RoundsOfPain || is1234Complex || isTheQuadrant || isSecretServiceSnatchTest) && (
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
                        
                        {/* Simple Sinister time */}
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
                        
                        {/* Date for kettlebell challenges */}
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
                        
                        {/* Murph time */}
                        {isMurphChallenge && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="MM:SS"
                              type="text"
                              className="w-28"
                              value={values[registration.id] || ""}
                              onChange={(e) =>
                                handleValueChange(registration.id, e.target.value)
                              }
                            />
                            <span className="text-muted-foreground text-sm">Zeit</span>
                          </div>
                        )}
                        
                        {/* Default: time-based for unknown challenges */}
                        {!isKettlebellChallenge && !isEnduranceRun && !isKettlebellSwing && !isSpringChallenge && !isMurphChallenge && !is10RoundsOfPain && !is1234Complex && !isClassicComplex && !isTheQuadrant && (
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="MM:SS"
                              type="text"
                              className="w-28"
                              value={values[registration.id] || ""}
                              onChange={(e) =>
                                handleValueChange(registration.id, e.target.value)
                              }
                            />
                            <span className="text-muted-foreground text-sm">Zeit</span>
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