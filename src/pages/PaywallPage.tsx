 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Dumbbell, Loader2, ArrowLeft, CreditCard, AlertTriangle } from "lucide-react";
 import { toast } from "sonner";
 
 interface PaywallPageProps {
   reason?: "inactive" | "no-membership";
 }
 
 const PaywallPage = ({ reason = "no-membership" }: PaywallPageProps) => {
   const [loading, setLoading] = useState(false);
 
   const handleSubscribe = async () => {
     setLoading(true);
     try {
       const { data, error } = await supabase.functions.invoke("create-checkout");
 
       if (error) throw error;
       if (data?.url) {
         window.location.href = data.url;
       }
     } catch (error: any) {
       toast.error("Fehler beim Starten des Checkouts. Bitte versuche es erneut.");
       console.error("Checkout error:", error);
     }
     setLoading(false);
   };
 
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
             to="/auth"
             className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
           >
             <ArrowLeft className="w-4 h-4" />
             Zurück
           </Link>
 
           <div className="challenge-card text-center">
             {reason === "inactive" ? (
               <>
                 <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                 <h1 className="text-2xl font-bold mb-4">Zugang deaktiviert</h1>
                 <p className="text-muted-foreground mb-6">
                   Dein Zugang wurde aufgrund von 6 Monaten Inaktivität deaktiviert.
                   Du kannst deinen Zugang durch eine Mitgliedschaft reaktivieren.
                 </p>
               </>
             ) : (
               <>
                 <CreditCard className="w-12 h-12 text-primary mx-auto mb-4" />
                 <h1 className="text-2xl font-bold mb-4">Mitgliedschaft erforderlich</h1>
                 <p className="text-muted-foreground mb-6">
                   Um Zugang zur Plattform zu erhalten, benötigst du eine aktive Mitgliedschaft.
                 </p>
               </>
             )}
 
             <div className="bg-muted/50 rounded-lg p-6 mb-6">
               <div className="text-3xl font-bold text-primary mb-2">7,99 €</div>
               <div className="text-sm text-muted-foreground">pro Monat</div>
               <ul className="text-left text-sm mt-4 space-y-2">
                 <li className="flex items-center gap-2">
                   <span className="text-primary">✓</span> Zugang zu allen Challenges
                 </li>
                 <li className="flex items-center gap-2">
                   <span className="text-primary">✓</span> Community-Bereich
                 </li>
                 <li className="flex items-center gap-2">
                   <span className="text-primary">✓</span> Leaderboards & Tracking
                 </li>
                 <li className="flex items-center gap-2">
                   <span className="text-primary">✓</span> Coaches Corner Q&A
                 </li>
               </ul>
             </div>
 
             <Button onClick={handleSubscribe} className="w-full" disabled={loading}>
               {loading ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Weiterleitung...
                 </>
               ) : (
                 <>
                   <CreditCard className="w-4 h-4 mr-2" />
                   Jetzt Mitglied werden
                 </>
               )}
             </Button>
           </div>
         </div>
       </div>
     </div>
   );
 };
 
 export default PaywallPage;