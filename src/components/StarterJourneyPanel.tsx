import { Link } from "react-router-dom";
import { useStarterJourney } from "@/hooks/useStarterJourney";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Dumbbell,
  BookOpen,
  Sparkles,
  Sun,
  RefreshCw,
  Heart,
  X,
} from "lucide-react";

interface DayContent {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; to: string };
}

const DAY_CONTENT: Record<number, DayContent> = {
  1: {
    icon: <MessageSquare className="w-5 h-5 text-primary" />,
    title: "Community First",
    description:
      "Stell dich der Community kurz vor – wer bist du und was treibt dich an?",
    action: { label: "Stell dich kurz vor", to: "/community" },
  },
  2: {
    icon: <Dumbbell className="w-5 h-5 text-primary" />,
    title: "Erster kleiner Trainings-Win",
    description:
      "Starte mit einem kurzen Beginner-Workout (~20 Min). Einfach loslegen!",
    action: { label: "Zum Workout", to: "/workout-club" },
  },
  3: {
    icon: <Heart className="w-5 h-5 text-primary" />,
    title: "Community Reflection",
    description:
      "Was war heute dein kleiner Trainings-Moment? Teile ihn in der Community.",
    action: { label: "Zur Diskussion", to: "/community" },
  },
  4: {
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    title: "Struktur & Programm-Einstieg",
    description:
      "Starte dein erstes Programm: Beginner Hybrid – Woche 1.",
    action: { label: "Programm starten", to: "/workout-club" },
  },
  5: {
    icon: <Sun className="w-5 h-5 text-primary" />,
    title: "Leichtes Engagement",
    description:
      "Was planst du fürs Wochenende? Tausch dich in der Community aus.",
    action: { label: "Zur Community", to: "/community" },
  },
  6: {
    icon: <RefreshCw className="w-5 h-5 text-primary" />,
    title: "Zweiter Trainings-Touchpoint",
    description:
      "Mach die nächste Session deines Programms oder ein kurzes Einzelworkout.",
    action: { label: "Weitertrainieren", to: "/workout-club" },
  },
  7: {
    icon: <Sparkles className="w-5 h-5 text-primary" />,
    title: "Reflexion & Fortschritt",
    description:
      "Du bist seit 7 Tagen dabei – was hat sich verändert? Schreib darüber!",
    action: { label: "Posten", to: "/community" },
  },
};

export const StarterJourneyPanel = () => {
  const { isEligible, currentDay, loading, dismissJourney } =
    useStarterJourney();

  if (loading || !isEligible) return null;

  const day = DAY_CONTENT[currentDay] || DAY_CONTENT[1];
  const progress = (currentDay / 7) * 100;

  return (
    <div className="bg-card border border-border p-5 mb-8 relative">
      <button
        onClick={dismissJourney}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Schließen"
      >
        <X className="w-4 h-4" />
      </button>

      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
        Deine erste Woche bei Team Tarek
      </p>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-muted-foreground">
          Tag {currentDay} / 7
        </span>
        <Progress value={progress} className="h-1.5 flex-1" />
      </div>

      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{day.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">{day.title}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {day.description}
          </p>
          {day.action && (
            <Button asChild size="sm" variant="outline">
              <Link to={day.action.to}>{day.action.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
