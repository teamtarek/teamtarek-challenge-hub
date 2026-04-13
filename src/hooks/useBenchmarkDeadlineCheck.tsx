import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Calls the server-side check_benchmark_deadlines function once per mount
 * to fail expired benchmark registrations and create cooldown records.
 */
export const useBenchmarkDeadlineCheck = () => {
  const { user } = useAuth();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!user || hasChecked.current) return;
    hasChecked.current = true;

    supabase.rpc("check_benchmark_deadlines", { _user_id: user.id }).then(({ error }) => {
      if (error) console.error("Benchmark deadline check failed:", error.message);
    });
  }, [user]);
};
