import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Clock, Dumbbell, Hash } from "lucide-react";

const timeStringToSeconds = (timeStr: string): number => {
  if (!timeStr.trim()) return 0;
  const parts = timeStr.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(timeStr, 10) || 0;
};

const secondsToTimeString = (seconds: number | null): string => {
  if (!seconds || seconds === 0) return "";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

interface ExistingResult {
  score: number | null;
  total_time_seconds: number | null;
  total_reps: number | null;
  kettlebell_weight_kg: number | null;
}

interface ResultEntryFormProps {
  registrationId: string;
  challengeSlug: string;
  challengeName: string;
  existingResult: ExistingResult;
  isVerified: boolean;
  onSuccess: () => void;
}

export const ResultEntryForm = ({
  registrationId,
  challengeSlug,
  challengeName,
  existingResult,
  isVerified,
  onSuccess,
}: ResultEntryFormProps) => {
  const isMurphChallenge = challengeName.toLowerCase().includes("murph");
  const isSnatchTest = challengeSlug === "5-minute-snatch-test";
  const isSecretServiceSnatchTest = challengeSlug === "secret-service-snatch-test";
  const isSimpleSinister = challengeSlug === "simple-sinister";
  const isRiteOfPassage = challengeSlug === "rite-of-passage";
  const isMeetBetty = challengeSlug === "meet-betty";
  const isTheMile = challengeSlug === "the-mile";
  const is5k = challengeSlug === "5-kilometer-run";
  const is10k = challengeSlug === "10-kilometer-run";
  const isEnduranceRun = isTheMile || is5k || is10k;
  const isKettlebellSwing = challengeSlug === "kettlebell-swing";
  const isSpringChallenge = challengeSlug === "spring-challenge-2026";
  const is10RoundsOfPain = challengeSlug === "10-rounds-of-pain";
  const is1234Complex = challengeSlug === "1234-complex";
  const isTheQuadrant = challengeSlug === "the-quadrant";
  const isClassicComplex = challengeSlug === "the-classic-complex";
  const isAnySnatchTest = isSnatchTest; // Only 5-min snatch test uses reps now
  const isKettlebellChallenge = isSnatchTest || isSimpleSinister || isRiteOfPassage || isMeetBetty;

  // Determine if this is a time-based challenge
  const isTimeChallenge = isMurphChallenge || isEnduranceRun || isSpringChallenge || isMeetBetty || isSimpleSinister || isRiteOfPassage || is10RoundsOfPain || is1234Complex || isTheQuadrant || isSecretServiceSnatchTest;
  // Classic Complex uses rounds + weight only (no time)

  // Initialize from existing result
  const getInitialTime = (): string => {
    if (isMurphChallenge) return secondsToTimeString(existingResult.score);
    if (isSimpleSinister) return secondsToTimeString(existingResult.total_time_seconds);
    if (isEnduranceRun || isSpringChallenge || isMeetBetty || isRiteOfPassage || is10RoundsOfPain || is1234Complex || isTheQuadrant || isSecretServiceSnatchTest) return secondsToTimeString(existingResult.total_time_seconds);
    return "";
  };

  const [timeValue, setTimeValue] = useState(getInitialTime());
  const [reps, setReps] = useState(existingResult.total_reps?.toString() || "");
  const [rounds, setRounds] = useState((is1234Complex || isRiteOfPassage || isClassicComplex) ? (existingResult.total_reps?.toString() || "") : "");
  const [kettlebellWeight, setKettlebellWeight] = useState(existingResult.kettlebell_weight_kg?.toString() || "");
  const [bettyLevel, setBettyLevel] = useState(isMeetBetty ? (existingResult.score?.toString() || "") : "");
  const [ropLevel, setRopLevel] = useState(isRiteOfPassage ? (existingResult.score?.toString() || "") : "");
  const [ssLevel, setSsLevel] = useState(isSimpleSinister ? (existingResult.score?.toString() || "") : "");
  const [swingPassFail, setSwingPassFail] = useState(existingResult.score === 1 ? "pass" : "fail");
  const [totalSwings, setTotalSwings] = useState(existingResult.total_reps?.toString() || "");
  const [loading, setLoading] = useState(false);

  const hasExistingResult = (): boolean => {
    if (isKettlebellSwing) return (existingResult.total_reps ?? 0) > 0;
    if (isAnySnatchTest) return (existingResult.total_reps ?? 0) > 0;
    if (isSecretServiceSnatchTest) return (existingResult.total_time_seconds ?? 0) > 0;
    if (is1234Complex || isClassicComplex) return (existingResult.total_reps ?? 0) > 0;
    if (isEnduranceRun || isSpringChallenge || isMeetBetty || is10RoundsOfPain || isTheQuadrant) return (existingResult.total_time_seconds ?? 0) > 0;
    if (isRiteOfPassage) return (existingResult.score ?? 0) > 0 || (existingResult.total_reps ?? 0) > 0;
    if (isSimpleSinister) return (existingResult.score ?? 0) > 0;
    if (isMurphChallenge) return (existingResult.score ?? 0) > 0;
    return (existingResult.score ?? 0) > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updateData: Record<string, unknown> = {
      is_verified: false, // Reset verification when result changes
    };

    if (isMurphChallenge) {
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.score = seconds;
    } else if (isSimpleSinister) {
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.total_time_seconds = seconds;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
      const levelNum = parseInt(ssLevel);
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 4) { toast.error("Bitte ein Level (1-4) auswählen"); setLoading(false); return; }
      updateData.score = levelNum;
    } else if (isKettlebellSwing) {
      updateData.score = swingPassFail === "pass" ? 1 : 0;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
      if (totalSwings) {
        const swings = parseInt(totalSwings);
        if (isNaN(swings) || swings < 0) { toast.error("Bitte eine gültige Anzahl Swings eingeben"); setLoading(false); return; }
        updateData.total_reps = swings;
      }
    } else if (isAnySnatchTest) {
      const repsNum = parseInt(reps);
      if (isNaN(repsNum) || repsNum <= 0) { toast.error("Bitte eine gültige Anzahl Wiederholungen eingeben"); setLoading(false); return; }
      updateData.total_reps = repsNum;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
    } else if (isSecretServiceSnatchTest) {
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.total_time_seconds = seconds;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
    } else if (is1234Complex) {
      const roundsNum = parseInt(rounds);
      if (isNaN(roundsNum) || roundsNum <= 0) { toast.error("Bitte eine gültige Rundenzahl eingeben"); setLoading(false); return; }
      updateData.total_reps = roundsNum;
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.total_time_seconds = seconds;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
    } else if (isClassicComplex) {
      const roundsNum = parseInt(rounds);
      if (isNaN(roundsNum) || roundsNum <= 0) { toast.error("Bitte eine gültige Rundenzahl eingeben"); setLoading(false); return; }
      updateData.total_reps = roundsNum;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
    } else if (isTheQuadrant) {
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.total_time_seconds = seconds;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
    } else if (isEnduranceRun || isSpringChallenge) {
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.total_time_seconds = seconds;
    } else if (is10RoundsOfPain) {
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.total_time_seconds = seconds;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
    } else if (isMeetBetty) {
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.total_time_seconds = seconds;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
      const levelNum = parseInt(bettyLevel);
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 4) { toast.error("Bitte ein Level (1-4) auswählen"); setLoading(false); return; }
      updateData.score = levelNum;
    } else if (isRiteOfPassage) {
      const roundsNum = parseInt(rounds);
      if (isNaN(roundsNum) || ![3, 4, 5].includes(roundsNum)) { toast.error("Bitte die Anzahl Runden (3, 4 oder 5) auswählen"); setLoading(false); return; }
      updateData.total_reps = roundsNum;
      if (kettlebellWeight) updateData.kettlebell_weight_kg = parseInt(kettlebellWeight);
      const seconds = timeStringToSeconds(timeValue);
      if (seconds) updateData.total_time_seconds = seconds;
      const levelNum = parseInt(ropLevel);
      if (isNaN(levelNum) || levelNum < 1 || levelNum > 4) { toast.error("Bitte ein Level (1-4) auswählen"); setLoading(false); return; }
      updateData.score = levelNum;
    } else {
      // Default: score as time (e.g. other challenges)
      const seconds = timeStringToSeconds(timeValue);
      if (!seconds) { toast.error("Bitte eine gültige Zeit eingeben (MM:SS)"); setLoading(false); return; }
      updateData.score = seconds;
    }

    const { error } = await supabase
      .from("registrations")
      .update(updateData)
      .eq("id", registrationId);

    setLoading(false);

    if (error) {
      toast.error("Fehler beim Speichern des Ergebnisses.");
      return;
    }

    toast.success("Ergebnis eingereicht! Es wird nach Verifizierung im Leaderboard angezeigt.");
    onSuccess();
  };

  if (isVerified) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Dein Ergebnis wurde verifiziert und ist im Leaderboard sichtbar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">
          {hasExistingResult() ? "Ergebnis bearbeiten" : "Ergebnis eintragen"}
        </h3>
      </div>

      {hasExistingResult() && (
        <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          Dein Ergebnis wartet auf Verifizierung durch einen Coach/Admin. Du kannst es bis dahin noch ändern.
        </p>
      )}

      {/* Time-based challenges */}
      {/* 10 Rounds of Pain: time + weight */}
      {is10RoundsOfPain && (
        <>
          <div className="space-y-2">
            <Label htmlFor="time">Gesamtzeit (MM:SS)</Label>
            <Input
              id="time"
              type="text"
              placeholder="z.B. 25:30"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="input-minimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Verwendetes Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="Frauen: 16, Männer: 24"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
        </>
      )}

      {(isMurphChallenge || isEnduranceRun || isSpringChallenge || isSimpleSinister) && (
        <div className="space-y-2">
          <Label htmlFor="time">Gesamtzeit (MM:SS oder H:MM:SS)</Label>
          <Input
            id="time"
            type="text"
            placeholder="z.B. 25:30"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            className="input-minimal"
          />
        </div>
      )}

      {/* Meet Betty: time + weight + level */}
      {isMeetBetty && (
        <>
          <div className="space-y-2">
            <Label htmlFor="time">Gesamtzeit (MM:SS)</Label>
            <Input
              id="time"
              type="text"
              placeholder="z.B. 08:30"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="input-minimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Verwendetes Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="z.B. 24"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
          <div className="space-y-2">
            <Label>Geschafftes Level</Label>
            <Select value={bettyLevel} onValueChange={setBettyLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Level wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 — Goblet Presses</SelectItem>
                <SelectItem value="2">Level 2 — SA KB Push Presses</SelectItem>
                <SelectItem value="3">Level 3 — Double KB Push Presses</SelectItem>
                <SelectItem value="4">Level 4 — Double KB Presses & Swings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Rite of Passage: level + time + weight */}
      {isRiteOfPassage && (
        <>
          <div className="space-y-2">
            <Label>Anzahl Runden</Label>
            <Select value={rounds} onValueChange={setRounds}>
              <SelectTrigger>
                <SelectValue placeholder="Runden wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Runden</SelectItem>
                <SelectItem value="4">4 Runden</SelectItem>
                <SelectItem value="5">5 Runden</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Geschafftes Level</Label>
            <Select value={ropLevel} onValueChange={setRopLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Level wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 — 3×Leiter 1-2-3, 20kg (M) / 12kg (F)</SelectItem>
                <SelectItem value="2">Level 2 — 3×Leiter 1-2-3, 24kg (M) / 16kg (F)</SelectItem>
                <SelectItem value="3">Level 3 — 5×Leiter 1-2-3-4-5, 24kg (M) / 16kg (F)</SelectItem>
                <SelectItem value="4">Level 4 — 5×Leiter 1-2-3-4-5, 50% BW (M) / 33% BW (F)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Zeit (MM:SS) — optional</Label>
            <Input
              id="time"
              type="text"
              placeholder="z.B. 12:30"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="input-minimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Kettlebell Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="z.B. 24"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
        </>
      )}

      {/* Simple & Sinister: level + time + weight */}
      {isSimpleSinister && (
        <>
          <div className="space-y-2">
            <Label>Geschafftes Level</Label>
            <Select value={ssLevel} onValueChange={setSsLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Level wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 — 20kg (M) / 12kg (F)</SelectItem>
                <SelectItem value="2">Level 2 — 24kg (M) / 16kg (F)</SelectItem>
                <SelectItem value="3">Level 3 — Simple (32kg M / 24kg F)</SelectItem>
                <SelectItem value="4">Level 4 — Sinister (48kg M / 32kg F)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Kettlebell Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="z.B. 32"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
        </>
      )}

      {/* Snatch tests: reps + weight */}
      {isAnySnatchTest && (
        <>
          <div className="space-y-2">
            <Label htmlFor="reps" className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Wiederholungen gesamt
            </Label>
            <Input
              id="reps"
              type="number"
              placeholder="z.B. 100"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="input-minimal"
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Kettlebell Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="z.B. 24"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
        </>
      )}

      {/* Kettlebell Swing */}
      {isKettlebellSwing && (
        <>
          <div className="space-y-2">
            <Label>Pass / Fail</Label>
            <Select value={swingPassFail} onValueChange={setSwingPassFail}>
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
            <Label htmlFor="swingWeight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Verwendetes Gewicht (kg)
            </Label>
            <Input
              id="swingWeight"
              type="number"
              placeholder="z.B. 24"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="swings" className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Gesamtzahl Swings
            </Label>
            <Input
              id="swings"
              type="number"
              placeholder="z.B. 10000"
              value={totalSwings}
              onChange={(e) => setTotalSwings(e.target.value)}
              className="input-minimal"
              min={0}
            />
          </div>
        </>
      )}

      {/* 1-2-3-4 Complex: rounds + time + weight */}
      {is1234Complex && (
        <>
          <div className="space-y-2">
            <Label htmlFor="rounds" className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Absolvierte Runden
            </Label>
            <Input
              id="rounds"
              type="number"
              placeholder="z.B. 20"
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              className="input-minimal"
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Gesamtzeit (MM:SS)</Label>
            <Input
              id="time"
              type="text"
              placeholder="z.B. 10:00"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="input-minimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Verwendetes Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="Frauen: 12, Männer: 20"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
        </>
      )}

      {/* Classic Complex: rounds + weight */}
      {isClassicComplex && (
        <>
          <div className="space-y-2">
            <Label htmlFor="rounds" className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Absolvierte Runden
            </Label>
            <Input
              id="rounds"
              type="number"
              placeholder="z.B. 15"
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              className="input-minimal"
              min={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Verwendetes Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="Frauen: 12, Männer: 20"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
        </>
      )}

      {/* The Quadrant: time + weight */}
      {isTheQuadrant && (
        <>
          <div className="space-y-2">
            <Label htmlFor="time">Gesamtzeit (MM:SS)</Label>
            <Input
              id="time"
              type="text"
              placeholder="z.B. 18:30"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="input-minimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Verwendetes Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="Frauen: 12, Männer: 20"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
          </div>
        </>
      )}

      {/* Default time-based for other challenges (e.g. Deadly Dozen, etc.) */}
      {!isMurphChallenge && !isEnduranceRun && !isSpringChallenge && !isSimpleSinister && !isMeetBetty && !isRiteOfPassage && !isAnySnatchTest && !isKettlebellSwing && !is10RoundsOfPain && !is1234Complex && !isTheQuadrant && !isClassicComplex && (
        <div className="space-y-2">
          <Label htmlFor="time">Gesamtzeit (MM:SS oder H:MM:SS)</Label>
          <Input
            id="time"
            type="text"
            placeholder="z.B. 45:30"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            className="input-minimal"
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Speichern...
          </>
        ) : hasExistingResult() ? (
          "Ergebnis aktualisieren"
        ) : (
          "Ergebnis einreichen"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Dein Ergebnis wird nach Verifizierung durch einen Coach im Leaderboard angezeigt.
      </p>
    </form>
  );
};
