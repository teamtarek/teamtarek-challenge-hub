 import { useState, useEffect } from "react";
 import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Dumbbell, Loader2, ArrowLeft, CreditCard, Ticket } from "lucide-react";
 import { useMembership } from "@/hooks/useMembership";
 import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

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
   const { status: membershipStatus, loading: membershipLoading, isActive, refreshMembership } = useMembership();
  
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
   const [inviteToken, setInviteToken] = useState("");
   const [checkoutLoading, setCheckoutLoading] = useState(false);
 
   // Handle subscription success callback
   useEffect(() => {
     const subscriptionStatus = searchParams.get("subscription");
     if (subscriptionStatus === "success") {
       toast.success("Mitgliedschaft erfolgreich aktiviert!");
       refreshMembership();
     } else if (subscriptionStatus === "canceled") {
       toast.info("Checkout abgebrochen.");
     }
   }, [searchParams, refreshMembership]);

  useEffect(() => {
     if (user && !authLoading && !membershipLoading) {
       // Check membership status
       if (membershipStatus === "inactive") {
         navigate("/paywall");
         return;
       }
       if (!isActive && membershipStatus !== null) {
         navigate("/paywall");
         return;
       }
      navigate("/");
    }
   }, [user, authLoading, membershipLoading, membershipStatus, isActive, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setLoading(true);
    const { error } = await signIn(validation.data.email, validation.data.password);
    
    if (error) {
       setLoading(false);
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Ungültige E-Mail oder Passwort");
      } else {
        toast.error("Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
      }
      return;
    }
    
     // Update activity on login
     await refreshMembership();
     setLoading(false);
 
    toast.success("Erfolgreich angemeldet!");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
     // Validate invite token
     if (!inviteToken.trim()) {
       toast.error("Einladungscode ist erforderlich.");
       return;
     }
 
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
    
    setLoading(true);
 
     // Check if token is valid before signup
     const { data: tokenData, error: tokenError } = await supabase
       .from("invite_tokens")
       .select("*")
       .eq("token", inviteToken.trim())
       .is("used_by_user_id", null)
       .maybeSingle();
 
     if (tokenError || !tokenData) {
       toast.error("Ungültiger oder bereits verwendeter Einladungscode.");
       setLoading(false);
       return;
     }
 
     // Check if token is expired
     if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
       toast.error("Dieser Einladungscode ist abgelaufen.");
       setLoading(false);
       return;
     }
 
     const { error } = await signUp(validation.data.email, validation.data.password, validation.data.displayName, inviteToken.trim());
    
    if (error) {
       setLoading(false);
      if (error.message.includes("already registered")) {
        toast.error("Diese E-Mail ist bereits registriert.");
      } else {
        toast.error("Registrierung fehlgeschlagen. Bitte versuche es erneut.");
      }
      return;
    }
    
     // Wait for user to be created and use the token
     // The token will be used after email confirmation via a trigger
     setLoading(false);
    toast.success("Erfolgreich registriert!");
   };
 
   const handleStartSubscription = async () => {
     setCheckoutLoading(true);
     try {
       const { data, error } = await supabase.functions.invoke("create-checkout");
       if (error) throw error;
       if (data?.url) {
         window.location.href = data.url;
       }
     } catch (error: any) {
       toast.error("Fehler beim Starten des Checkouts.");
       console.error("Checkout error:", error);
     }
     setCheckoutLoading(false);
  };

   if (authLoading || membershipLoading) {
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
                <form onSubmit={handleSignup} className="space-y-4">
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
 
                   <div className="space-y-2">
                     <Label htmlFor="invite-token">Einladungscode</Label>
                     <div className="relative">
                       <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                       <Input
                         id="invite-token"
                         type="text"
                         placeholder="XXXX-XXXX-XXXX"
                         value={inviteToken}
                         onChange={(e) => setInviteToken(e.target.value)}
                         className="input-minimal pl-10"
                         required
                       />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Du benötigst einen Einladungscode zur Registrierung.
                     </p>
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
                </form>
              </TabsContent>
             </Tabs>
 
             {/* Stripe Subscription Option */}
             <div className="mt-6 pt-6 border-t border-border">
               <p className="text-sm text-muted-foreground text-center mb-4">
                 Kein Einladungscode? Starte eine Mitgliedschaft:
               </p>
               <Button 
                 variant="outline" 
                 className="w-full gap-2" 
                 onClick={handleStartSubscription}
                 disabled={checkoutLoading}
               >
                 {checkoutLoading ? (
                   <>
                     <Loader2 className="w-4 h-4 animate-spin" />
                     Weiterleitung...
                   </>
                 ) : (
                   <>
                     <CreditCard className="w-4 h-4" />
                     Mitglied werden – 7,99 €/Monat
                   </>
                 )}
               </Button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
