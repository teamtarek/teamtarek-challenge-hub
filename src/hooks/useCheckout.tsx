import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCheckout = () => {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    
    try {
      // Try to get session - checkout works for both authenticated and guest users
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers,
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
