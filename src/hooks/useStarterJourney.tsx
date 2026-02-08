import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StarterJourneyState {
  isEligible: boolean;
  currentDay: number;
  loading: boolean;
}

export const useStarterJourney = () => {
  const { user } = useAuth();
  const [state, setState] = useState<StarterJourneyState>({
    isEligible: false,
    currentDay: 1,
    loading: true,
  });

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setState({ isEligible: false, currentDay: 1, loading: false });
        return;
      }

      // Check if journey already completed
      const { data: journey } = await supabase
        .from("user_starter_journey")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (journey?.completed_at) {
        setState({ isEligible: false, currentDay: 7, loading: false });
        return;
      }

      // Calculate account age
      const createdAt = new Date(user.created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceCreation >= 7 && !journey) {
        // Account older than 7 days and never started — not eligible
        setState({ isEligible: false, currentDay: 1, loading: false });
        return;
      }

      const currentDay = Math.min(daysSinceCreation + 1, 7);

      // Create journey record if it doesn't exist
      if (!journey) {
        await supabase
          .from("user_starter_journey")
          .insert({ user_id: user.id, started_at: createdAt.toISOString() });
      }

      // Auto-complete on day 7+
      if (currentDay >= 7 && journey && !journey.completed_at) {
        await supabase
          .from("user_starter_journey")
          .update({ completed_at: new Date().toISOString() })
          .eq("user_id", user.id);
        setState({ isEligible: false, currentDay: 7, loading: false });
        return;
      }

      setState({ isEligible: true, currentDay, loading: false });
    };

    check();
  }, [user]);

  const dismissJourney = async () => {
    if (!user) return;
    await supabase
      .from("user_starter_journey")
      .update({ completed_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setState((prev) => ({ ...prev, isEligible: false }));
  };

  return { ...state, dismissJourney };
};
