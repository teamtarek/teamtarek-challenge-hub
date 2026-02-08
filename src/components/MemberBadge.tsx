import { MemberType, getMemberTypeBadge, getFoundingMemberBadge } from "@/hooks/useUserRole";
import { Shield, Crown, Star, UserCheck, Award, Dumbbell } from "lucide-react";

interface MemberBadgeProps {
  memberType: MemberType;
  isFoundingMember?: boolean;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export const MemberBadge = ({ memberType, isFoundingMember = false, size = "md", showIcon = true }: MemberBadgeProps) => {
  const badge = getMemberTypeBadge(memberType);

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

  const IconMap: Record<string, typeof Crown> = {
    webmaster: Crown,
    admin: Shield,
    coach: Dumbbell,
    member: Star,
    prospect: UserCheck,
  };

  const Icon = IconMap[memberType || "prospect"];

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {badge && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border font-medium ${badge.className} ${sizeClasses[size]}`}
        >
          {showIcon && Icon && <Icon className={iconSize[size]} />}
          {badge.label}
        </span>
      )}
      {isFoundingMember && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border font-medium ${getFoundingMemberBadge().className} ${sizeClasses[size]}`}
        >
          {showIcon && <Award className={iconSize[size]} />}
          {getFoundingMemberBadge().label}
        </span>
      )}
    </span>
  );
};
