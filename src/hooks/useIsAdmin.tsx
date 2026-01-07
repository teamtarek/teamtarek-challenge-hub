import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const WEBMASTER_EMAIL = "tobias.gunst@googlemail.com";

export const useIsAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWebmaster, setIsWebmaster] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsWebmaster(false);
        setLoading(false);
        return;
      }

      // Check if webmaster (by email)
      if (user.email === WEBMASTER_EMAIL) {
        setIsWebmaster(true);
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  return { isAdmin, isWebmaster, loading };
};
