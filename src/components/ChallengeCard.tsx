import { Link } from "react-router-dom";
import { Calendar, ArrowRight } from "lucide-react";

interface ChallengeCardProps {
  slug: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  index: number;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
};

const formatDateRange = (start: string, end: string | null) => {
  if (!end || start === end) {
    return formatDate(start);
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (startDate.getFullYear() === endDate.getFullYear()) {
    if (startDate.getMonth() === endDate.getMonth()) {
      return formatDate(start);
    }
    return `${startDate.toLocaleDateString("de-DE", { month: "long" })} - ${endDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
};

export const ChallengeCard = ({
  slug,
  name,
  description,
  startDate,
  endDate,
  index,
}: ChallengeCardProps) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  
  const isActive = now >= start && now <= end;
  const isUpcoming = now < start;

  return (
    <Link
      to={`/challenge/${slug}`}
      className="challenge-card group block opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`challenge-badge ${isActive ? 'challenge-badge-active' : ''}`}>
          {isActive ? "AKTIV" : isUpcoming ? "BALD" : "BEENDET"}
        </span>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
        {name}
      </h3>
      
      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
        {description}
      </p>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
        <Calendar className="w-4 h-4" />
        {formatDateRange(startDate, endDate)}
      </div>
    </Link>
  );
};
