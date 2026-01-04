import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { z } from "zod";

const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(100, "Name darf maximal 100 Zeichen haben"),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben").max(255, "E-Mail darf maximal 255 Zeichen haben"),
});

interface RegistrationFormProps {
  challengeId: string;
  challengeName: string;
  onSuccess: () => void;
}

export const RegistrationForm = ({ challengeId, challengeName, onSuccess }: RegistrationFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = registrationSchema.safeParse({ name, email });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("registrations").insert({
      challenge_id: challengeId,
      participant_name: validation.data.name,
      email: validation.data.email,
    });

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
    
    // Store registration in localStorage for leaderboard access
    const registeredChallenges = JSON.parse(localStorage.getItem("registeredChallenges") || "{}");
    registeredChallenges[challengeId] = { name: validation.data.name, email: validation.data.email };
    localStorage.setItem("registeredChallenges", JSON.stringify(registeredChallenges));
    
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
        />
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
