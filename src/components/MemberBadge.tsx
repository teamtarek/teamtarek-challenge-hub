import { MemberType, getMemberTypeBadge } from "@/hooks/useUserRole";
import { Shield, Crown, Star, UserCheck } from "lucide-react";

interface MemberBadgeProps {
  memberType: MemberType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export const MemberBadge = ({ memberType, size = "md", showIcon = true }: MemberBadgeProps) => {
  const badge = getMemberTypeBadge(memberType);
  if (!badge) return null;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };

  const iconSize = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const Icon = {
    webmaster: Crown,
    admin: Shield,
    member: Star,
    prospect: UserCheck,
  }[memberType || "prospect"];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${badge.className} ${sizeClasses[size]}`}
    >
      {showIcon && Icon && <Icon className={iconSize[size]} />}
      {badge.label}
    </span>
  );
};
