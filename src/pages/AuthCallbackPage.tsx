import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase sends tokens via hash fragment after email confirmation
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Auth callback error:", error);
            toast.error("Authentifizierung fehlgeschlagen. Bitte versuche es erneut.");
            setStatus("error");
            setTimeout(() => navigate("/auth"), 2000);
            return;
          }

          if (type === "signup" || type === "email") {
            toast.success("E-Mail bestätigt! Willkommen bei Team Tarek!");
          } else {
            toast.success("Erfolgreich angemeldet!");
          }

          navigate("/dashboard");
          return;
        }

        // Also check if there's already a valid session (e.g. from onAuthStateChange)
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate("/dashboard");
        } else {
          // No tokens found - redirect to login
          navigate("/auth");
        }
      } catch (err) {
        console.error("Auth callback unexpected error:", err);
        toast.error("Ein unerwarteter Fehler ist aufgetreten.");
        setStatus("error");
        setTimeout(() => navigate("/auth"), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground">
        {status === "loading" ? "Anmeldung wird verarbeitet..." : "Weiterleitung..."}
      </p>
    </div>
  );
};

export default AuthCallbackPage;
