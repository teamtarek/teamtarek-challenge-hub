 import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/hooks/useAuth";
 
 type MembershipStatus = "active" | "inactive" | "canceled" | "past_due" | null;
 
 interface MembershipContextType {
   status: MembershipStatus;
   loading: boolean;
   isActive: boolean;
   updateActivity: () => Promise<void>;
   refreshMembership: () => Promise<void>;
 }
 
 const MembershipContext = createContext<MembershipContextType | undefined>(undefined);
 
 export const MembershipProvider = ({ children }: { children: ReactNode }) => {
   const { user, loading: authLoading } = useAuth();
   const [status, setStatus] = useState<MembershipStatus>(null);
   const [loading, setLoading] = useState(true);
 
   const fetchMembership = useCallback(async () => {
     if (!user) {
       setStatus(null);
       setLoading(false);
       return;
     }
 
     const { data, error } = await supabase
       .from("memberships")
       .select("status")
       .eq("user_id", user.id)
       .maybeSingle();
 
     if (error) {
       console.error("Error fetching membership:", error);
       setStatus(null);
     } else if (data) {
       setStatus(data.status as MembershipStatus);
     } else {
       setStatus(null);
     }
     setLoading(false);
   }, [user]);
 
   const updateActivity = useCallback(async () => {
     if (!user) return;
 
     await supabase.rpc("update_membership_activity", { _user_id: user.id });
   }, [user]);
 
   const refreshMembership = useCallback(async () => {
     await fetchMembership();
   }, [fetchMembership]);
 
   useEffect(() => {
     if (!authLoading) {
       fetchMembership();
     }
   }, [authLoading, fetchMembership]);
 
   // Update activity on mount if user is logged in
   useEffect(() => {
     if (user && status === "active") {
       updateActivity();
     }
   }, [user, status, updateActivity]);
 
   const isActive = status === "active";
 
   return (
     <MembershipContext.Provider value={{ status, loading, isActive, updateActivity, refreshMembership }}>
       {children}
     </MembershipContext.Provider>
   );
 };
 
 export const useMembership = () => {
   const context = useContext(MembershipContext);
   if (context === undefined) {
     throw new Error("useMembership must be used within a MembershipProvider");
   }
   return context;
 };