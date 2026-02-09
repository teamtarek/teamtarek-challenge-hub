import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Loader2, ArrowLeft, Ticket } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useCheckout } from "@/hooks/useCheckout";

const loginSchema = z.object({
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
});

const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben").max(50, "Name darf maximal 50 Zeichen haben"),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const { startCheckout, loading: checkoutLoading } = useCheckout();

  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupToken, setSignupToken] = useState(searchParams.get("token") || "");

  // Determine signup mode
  const hasStripeEmail = searchParams.get("stripe_email") || "";
  const signupMode: "token" | "stripe" | "choose" = signupToken
    ? "token"
    : hasStripeEmail
    ? "stripe"
    : "choose";

  useEffect(() => {
    if (hasStripeEmail && !signupEmail) {
      setSignupEmail(hasStripeEmail);
    }
  }, [hasStripeEmail, signupEmail]);

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(validation.data.email, validation.data.password);
    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Ungültige E-Mail oder Passwort");
      } else {
        toast.error("Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
      }
      return;
    }

    toast.success("Erfolgreich angemeldet!");
    navigate("/dashboard");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = signupSchema.safeParse({
      displayName: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Must have a token or stripe authorization
    if (!signupToken && !hasStripeEmail) {
      toast.error("Registrierung nur mit Einladung oder nach Stripe-Zahlung möglich.");
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      validation.data.email,
      validation.data.password,
      validation.data.displayName,
      signupToken || undefined,
    );
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Erfolgreich registriert!");
    navigate("/dashboard");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Dumbbell className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold tracking-tight">Team Tarek</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Startseite
          </Link>

          <div className="challenge-card">
            <h1 className="text-2xl font-bold mb-6 text-center">Willkommen</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="signup">Registrieren</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-Mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="deine@email.de"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="input-minimal"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Passwort</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="input-minimal"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Anmelden...
                      </>
                    ) : (
                      "Anmelden"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {/* Info box about closed registration */}
                <div className="bg-muted/50 border border-border rounded-md p-4 mb-6">
                  <p className="text-sm text-muted-foreground">
                    Registrierung nur mit Einladungscode oder nach erfolgreichem Stripe-Checkout möglich.
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Token input */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-token" className="flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      Einladungscode
                    </Label>
                    <Input
                      id="signup-token"
                      type="text"
                      placeholder="Dein Einladungscode (falls vorhanden)"
                      value={signupToken}
                      onChange={(e) => setSignupToken(e.target.value)}
                      className="input-minimal"
                    />
                  </div>

                  {/* Stripe checkout option */}
                  {!signupToken && !hasStripeEmail && (
                    <div className="border border-border rounded-md p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Kein Einladungscode? Starte mit einer Mitgliedschaft.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startCheckout}
                        disabled={checkoutLoading}
                      >
                        {checkoutLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Wird geladen...
                          </>
                        ) : (
                          "Mitgliedschaft starten (7,99 €/Monat)"
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Show email confirmation for Stripe flow */}
                  {hasStripeEmail && (
                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                      <p className="text-sm text-primary">
                        ✓ Zahlung bestätigt. Erstelle jetzt deinen Account.
                      </p>
                    </div>
                  )}

                  {/* Only show registration fields if token or stripe auth exists */}
                  {(signupToken || hasStripeEmail) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Dein Name"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="input-minimal"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">E-Mail</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="deine@email.de"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="input-minimal"
                          required
                          readOnly={!!hasStripeEmail}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Passwort</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="input-minimal"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm-password">Passwort bestätigen</Label>
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
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
                          "Registrieren"
                        )}
                      </Button>
                    </>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
