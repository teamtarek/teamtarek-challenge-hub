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
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { z } from "zod";

const MURPH_VERSIONS = ["Standard", "Female Version", "Beginner Version"] as const;
const VALIDATION_TYPES = ["coach", "video"] as const;

const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(100, "Name darf maximal 100 Zeichen haben"),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben").max(255, "E-Mail darf maximal 255 Zeichen haben"),
});

const videoUrlSchema = z.string().url("Bitte eine gültige URL eingeben").refine(
  (url) => url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com"),
  "Bitte eine YouTube oder Vimeo URL eingeben"
);

interface RegistrationFormProps {
  challengeId: string;
  challengeName: string;
  challengeSlug?: string;
  onSuccess: () => void;
}

export const RegistrationForm = ({ challengeId, challengeName, challengeSlug, onSuccess }: RegistrationFormProps) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.display_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [murphVersion, setMurphVersion] = useState<string>("Standard");
  const [validationType, setValidationType] = useState<string>("coach");
  const [videoUrl, setVideoUrl] = useState("");
  const [kettlebellWeight, setKettlebellWeight] = useState<string>("");
  const [swingPassFail, setSwingPassFail] = useState<string>("pass");
  const [totalSwings, setTotalSwings] = useState<string>("");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isMurphChallenge = challengeName.toLowerCase().includes("murph");
  const isSnatchTest = challengeSlug === "5-minute-snatch-test";
  const isSecretServiceSnatchTest = challengeSlug === "secret-service-snatch-test";
  const isSimpleSinister = challengeSlug === "simple-sinister";
  const isRiteOfPassage = challengeSlug === "rite-of-passage";
  const isTheMile = challengeSlug === "the-mile";
  const isKettlebellSwing = challengeSlug === "kettlebell-swing";
  const isKettlebellChallenge = isSnatchTest || isSecretServiceSnatchTest || isSimpleSinister || isRiteOfPassage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = registrationSchema.safeParse({ name, email });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Validate video URL if video validation is selected
    if (validationType === "video") {
      if (!videoUrl.trim()) {
        toast.error("Bitte einen Video-Link eingeben");
        return;
      }
      const videoValidation = videoUrlSchema.safeParse(videoUrl);
      if (!videoValidation.success) {
        toast.error(videoValidation.error.errors[0].message);
        return;
      }
    }

    // Validate kettlebell weight for kettlebell challenges
    if (isKettlebellChallenge && kettlebellWeight) {
      const weight = parseInt(kettlebellWeight);
      if (isNaN(weight) || weight < 4 || weight > 92) {
        toast.error("Bitte ein gültiges Kettlebell-Gewicht eingeben (4-92 kg)");
        return;
      }
    }

    setLoading(true);

    const insertData: any = {
      challenge_id: challengeId,
      participant_name: validation.data.name,
      email: validation.data.email,
      user_id: user?.id || null,
      year: year,
      validation_type: validationType,
      video_url: validationType === "video" ? videoUrl.trim() : null,
      is_verified: false,
    };

    if (isMurphChallenge) {
      insertData.murph_version = murphVersion;
    }

    if (isKettlebellSwing) {
      insertData.score = swingPassFail === "pass" ? 1 : 0;
      insertData.kettlebell_weight_kg = kettlebellWeight ? parseInt(kettlebellWeight) : null;
      insertData.total_reps = totalSwings ? parseInt(totalSwings) : null;
    } else if (isKettlebellChallenge && kettlebellWeight) {
      insertData.kettlebell_weight_kg = parseInt(kettlebellWeight);
    }

    const { error } = await supabase.from("registrations").insert(insertData);

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Du bist bereits für diese Challenge registriert.");
      } else {
        toast.error("Registrierung fehlgeschlagen. Bitte versuche es erneut.");
      }
      return;
    }

    setSuccess(true);
    toast.success("Erfolgreich registriert!");
    
    // Store registration in localStorage for leaderboard access (for non-logged-in users)
    if (!user) {
      const registeredChallenges = JSON.parse(localStorage.getItem("registeredChallenges") || "{}");
      registeredChallenges[challengeId] = { name: validation.data.name, email: validation.data.email };
      localStorage.setItem("registeredChallenges", JSON.stringify(registeredChallenges));
    }
    
    onSuccess();
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Registrierung erfolgreich!</h3>
        <p className="text-muted-foreground">Du bist jetzt für {challengeName} angemeldet.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Dein Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-minimal"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="deine@email.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-minimal"
          required
          disabled={!!user?.email}
        />
        {user?.email && (
          <p className="text-xs text-muted-foreground">E-Mail aus deinem Profil</p>
        )}
      </div>

      {isMurphChallenge && (
        <div className="space-y-2">
          <Label>Murph Version</Label>
          <Select value={murphVersion} onValueChange={setMurphVersion}>
            <SelectTrigger>
              <SelectValue placeholder="Version wählen" />
            </SelectTrigger>
            <SelectContent>
              {MURPH_VERSIONS.map((version) => (
                <SelectItem key={version} value={version}>
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isKettlebellChallenge && (
        <div className="space-y-2">
          <Label htmlFor="kettlebellWeight">Kettlebell Gewicht (kg)</Label>
          <Input
            id="kettlebellWeight"
            type="number"
            placeholder="z.B. 24"
            value={kettlebellWeight}
            onChange={(e) => setKettlebellWeight(e.target.value)}
            className="input-minimal"
            min={4}
            max={92}
          />
          <p className="text-xs text-muted-foreground">
            {isSnatchTest && "Standard: 24 kg (Männer) / 16 kg (Frauen)"}
            {isSecretServiceSnatchTest && "Standard: 24 kg (Männer) / 16 kg (Frauen)"}
            {isSimpleSinister && "Simple: 32 kg (M) / 24 kg (F) | Sinister: 48 kg (M) / 32 kg (F)"}
            {isRiteOfPassage && "Ziel: Halbes Körpergewicht"}
          </p>
        </div>
      )}

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
            <Label htmlFor="kettlebellWeightSwing">Verwendetes Gewicht (kg)</Label>
            <Input
              id="kettlebellWeightSwing"
              type="number"
              placeholder="z.B. 24"
              value={kettlebellWeight}
              onChange={(e) => setKettlebellWeight(e.target.value)}
              className="input-minimal"
              min={4}
              max={92}
            />
            <p className="text-xs text-muted-foreground">
              Bei mehreren Gewichten: Hauptgewicht eintragen
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalSwings">Gesamtzahl Swings</Label>
            <Input
              id="totalSwings"
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

      <div className="space-y-2">
        <Label>Jahr</Label>
        {isKettlebellSwing ? (
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Jahr wählen" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: currentYear - 2018 }, (_, i) => currentYear - i).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type="text"
            value={year}
            disabled
            className="input-minimal bg-muted"
          />
        )}
      </div>

      {/* Validation Type Section */}
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          Alle Ergebnisse müssen entweder durch ein Video validiert werden (bei YouTube hochladen (auf Privat stellen) und Link hier posten) oder durch einen autorisierten Coach abgenommen sein. Bitte entsprechende Option auswählen. Alle eingereichten Ergebnisse werden durch einen autorisierten Coach überprüft.
        </p>
        
        <div className="space-y-2">
          <Label>Validierungsart</Label>
          <Select value={validationType} onValueChange={setValidationType}>
            <SelectTrigger>
              <SelectValue placeholder="Validierungsart wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coach">Autorisiert durch Coach (z.B. in Person ausgeführt)</SelectItem>
              <SelectItem value="video">Videobeweis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {validationType === "video" && (
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video-Link (YouTube / Vimeo)</Label>
            <Input
              id="videoUrl"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="input-minimal"
            />
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Registrieren...
          </>
        ) : (
          "Jetzt registrieren"
        )}
      </Button>
    </form>
  );
};