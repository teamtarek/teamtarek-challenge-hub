import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase automatically exchanges the token from the URL hash
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.error("Auth callback error:", error);
        navigate("/auth");
        return;
      }
      navigate("/dashboard");
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default AuthCallbackPage;
