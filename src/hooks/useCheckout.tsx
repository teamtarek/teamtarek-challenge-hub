import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCheckout = () => {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    
    try {
      // Get the current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error("Bitte melde dich an, um eine Mitgliedschaft zu starten.");
        setLoading(false);
        return;
      }

      // Call the edge function - supabase.functions.invoke automatically includes the auth token
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Checkout error:", error);
        toast.error("Fehler beim Starten des Checkouts. Bitte versuche es erneut.");
        setLoading(false);
        return;
      }

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast.error("Checkout-URL konnte nicht abgerufen werden.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return { startCheckout, loading };
};
