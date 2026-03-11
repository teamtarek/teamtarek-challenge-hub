import { Link } from "react-router-dom";
import { Calendar, ArrowRight } from "lucide-react";

// Challenge images
import springImg from "@/assets/challenges/spring-challenge.jpg";
import murphImg from "@/assets/challenges/murph.jpg";
import deadlyDozenImg from "@/assets/challenges/deadly-dozen.jpg";
import summerImg from "@/assets/challenges/summer-challenge.jpg";
import kettlebellImg from "@/assets/challenges/kettlebell.jpg";
import winterImg from "@/assets/challenges/winter-challenge.jpg";
import pumpRowImg from "@/assets/challenges/pump-row.jpg";
import tareksTrifectaImg from "@/assets/challenges/tareks-trifecta.jpg";
import armyFitnessImg from "@/assets/challenges/army-fitness-test.jpg";
import snatchTestImg from "@/assets/challenges/5-minute-snatch-test.jpg";
import simpleSinisterImg from "@/assets/challenges/simple-sinister.jpg";
import riteOfPassageImg from "@/assets/challenges/rite-of-passage.jpg";
import meetBettyImg from "@/assets/challenges/meet-betty.jpg";
import theMileImg from "@/assets/challenges/the-mile.jpg";
import ssstImg from "@/assets/challenges/secret-service-snatch-test.jpg";
import fiveKImg from "@/assets/challenges/5-kilometer-run.jpg";
import tenKImg from "@/assets/challenges/10-kilometer-run.jpg";
import tenRoundsImg from "@/assets/challenges/10-rounds-of-pain.jpg";
import complexImg from "@/assets/challenges/1234-complex.jpg";
import theQuadrantImg from "@/assets/challenges/the-quadrant.jpg";
import theClassicComplexImg from "@/assets/challenges/the-classic-complex.jpg";

const challengeImages: Record<string, string> = {
  "spring-challenge-2026": springImg,
  "murph": murphImg,
  "murph-2026": murphImg,
  "deadly-dozen": deadlyDozenImg,
  "summer-challenge-2026": summerImg,
  "kettlebell-swing": kettlebellImg,
  "kettlebell-swing-2026": kettlebellImg,
  "winter-challenge-2026": winterImg,
  "pump-row": pumpRowImg,
  "tareks-trifecta": tareksTrifectaImg,
  "army-fitness-test": armyFitnessImg,
  "5-minute-snatch-test": snatchTestImg,
  "simple-sinister": simpleSinisterImg,
  "rite-of-passage": riteOfPassageImg,
  "meet-betty": meetBettyImg,
  "the-mile": theMileImg,
  "secret-service-snatch-test": ssstImg,
  "5-kilometer-run": fiveKImg,
  "10-kilometer-run": tenKImg,
  "10-rounds-of-pain": tenRoundsImg,
  "1234-complex": complexImg,
  "the-quadrant": theQuadrantImg,
};

// Custom object positions for specific challenges
const challengeObjectPositions: Record<string, string> = {
  "winter-challenge-2026": "center 20%",
  "5-minute-snatch-test": "center top",
  "deadly-dozen": "center 30%",
  "the-quadrant": "center 35%",
  "the-classic-complex": "center 40%",
  "10-rounds-of-pain": "center 40%",
};

// Custom object fit for specific challenges (to show full image)
const challengeObjectFit: Record<string, string> = {
  "5-minute-snatch-test": "contain",
};

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

  const heroImage = challengeImages[slug];
  const objectPosition = challengeObjectPositions[slug] || "center";
  const objectFit = challengeObjectFit[slug] || "cover";

  return (
    <Link
      to={`/challenge/${slug}`}
      className="challenge-card group block opacity-0 animate-fade-in overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Hero Image */}
      {heroImage && (
        <div className="relative h-40 -mx-6 -mt-6 mb-4 overflow-hidden">
          <img 
            src={heroImage} 
            alt={name}
            className="w-full h-full transition-transform duration-500 group-hover:scale-110"
            style={{ objectPosition, objectFit: objectFit as "cover" | "contain" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          <span className={`absolute top-3 left-3 challenge-badge ${isActive ? 'challenge-badge-active' : ''}`}>
            {isActive ? "AKTIV" : isUpcoming ? "BALD" : "BEENDET"}
          </span>
        </div>
      )}

      {!heroImage && (
        <div className="flex items-start justify-between mb-4">
          <span className={`challenge-badge ${isActive ? 'challenge-badge-active' : ''}`}>
            {isActive ? "AKTIV" : isUpcoming ? "BALD" : "BEENDET"}
          </span>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
          {name}
        </h3>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
      
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