import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type MemberType = "webmaster" | "admin" | "coach" | "member" | "prospect" | null;

export const useUserRole = () => {
  const { user } = useAuth();
  const [memberType, setMemberType] = useState<MemberType>(null);
  const [isFoundingMember, setIsFoundingMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const checkMemberType = async () => {
    if (!user) {
      setMemberType(null);
      setIsFoundingMember(false);
      setLoading(false);
      return;
    }

    // Fetch founding member status
    const { data: profileData } = await supabase
      .from("profiles")
      .select("is_founding_member")
      .eq("user_id", user.id)
      .maybeSingle();

    // Check roles in user_roles table
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = roleData?.map((r) => r.role) ?? [];

    if (roles.includes("webmaster")) {
      setMemberType("webmaster");
      setLoading(false);
      return;
    }


    if (roles.includes("admin")) {
      setMemberType("admin");
      setLoading(false);
      return;
    }

    if (roles.includes("coach")) {
      setMemberType("coach");
      setLoading(false);
      return;
    }

    // Check if has active membership (from Stripe or token)
    const { data: membershipData } = await supabase
      .from("memberships")
      .select("status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (membershipData) {
      setMemberType("member");
      setLoading(false);
      return;
    }

    // Check if member (has verified result with score)
    const { data: memberData } = await supabase
      .from("registrations")
      .select("id, score, total_reps, kettlebell_weight_kg, is_verified")
      .eq("user_id", user.id)
      .eq("is_verified", true);

    if (memberData && memberData.length > 0) {
      const hasVerifiedResult = memberData.some(
        (reg) =>
          (reg.score !== null && reg.score > 0) ||
          (reg.total_reps !== null && reg.total_reps > 0) ||
          (reg.kettlebell_weight_kg !== null && reg.kettlebell_weight_kg > 0)
      );

      if (hasVerifiedResult) {
        setMemberType("member");
        setLoading(false);
        return;
      }
    }

    // Default for logged-in users
    setMemberType("prospect");
    setLoading(false);
  };

  useEffect(() => {
    checkMemberType();
  }, [user, refreshCounter]);

  const refetch = () => {
    setLoading(true);
    setRefreshCounter((c) => c + 1);
  };

  const isWebmaster = memberType === "webmaster";
  const isAdmin = memberType === "admin" || memberType === "webmaster";
  const isCoach = memberType === "coach" || isAdmin;
  const isMember = memberType === "member" || memberType === "coach" || isAdmin;
  const canAccessCoachesCorner = isMember;

  return { 
    memberType, 
    loading, 
    isWebmaster, 
    isAdmin, 
    isCoach,
    isMember, 
    isFoundingMember,
    canAccessCoachesCorner,
    refetch
  };
};

export const getMemberTypeBadge = (memberType: MemberType) => {
  switch (memberType) {
    case "webmaster":
      return { label: "Webmaster", className: "bg-primary/20 text-primary border-primary/30" };
    case "admin":
      return { label: "Admin", className: "bg-primary/20 text-primary border-primary/30" };
    case "coach":
      return { label: "Coach", className: "bg-primary/20 text-primary border-primary/30" };
    case "member":
      return { label: "Member", className: "bg-primary/15 text-primary/80 border-primary/25" };
    case "prospect":
      return { label: "Prospect", className: "bg-muted text-muted-foreground border-border" };
    default:
      return null;
  }
};

export const getFoundingMemberBadge = () => ({
  label: "Founding Member",
  className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
});

export const AGE_CLASSES = [
  { value: "14-29", label: "14-29 Jahre" },
  { value: "30-39", label: "30-39 Jahre" },
  { value: "40-49", label: "40-49 Jahre" },
  { value: "50-65", label: "50-65 Jahre" },
  { value: "65-79", label: "65-79 Jahre" },
  { value: "79+", label: "79+ Jahre" },
] as const;
