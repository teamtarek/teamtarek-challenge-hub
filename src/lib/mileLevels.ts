// Mile level system - levels based on time and gender
// Times are in seconds

export interface MileLevel {
  level: number;
  label: string;
  className: string;
}

const MILE_LEVELS_MALE = [
  { level: 4, maxSeconds: 5 * 60 + 45 },  // ≤ 5:45
  { level: 3, maxSeconds: 6 * 60 + 45 },  // ≤ 6:45
  { level: 2, maxSeconds: 8 * 60 },        // ≤ 8:00
  { level: 1, maxSeconds: 9 * 60 + 30 },  // ≤ 9:30
];

const MILE_LEVELS_FEMALE = [
  { level: 4, maxSeconds: 6 * 60 + 45 },  // ≤ 6:45
  { level: 3, maxSeconds: 7 * 60 + 45 },  // ≤ 7:45
  { level: 2, maxSeconds: 9 * 60 },        // ≤ 9:00
  { level: 1, maxSeconds: 10 * 60 + 30 }, // ≤ 10:30
];

export const getMileLevel = (timeSeconds: number, gender: string | null): MileLevel | null => {
  if (!timeSeconds || timeSeconds <= 0) return null;
  
  const levels = gender === "female" ? MILE_LEVELS_FEMALE : MILE_LEVELS_MALE;
  
  for (const { level, maxSeconds } of levels) {
    if (timeSeconds <= maxSeconds) {
      return {
        level,
        label: `Level ${level}`,
        className: getLevelClassName(level),
      };
    }
  }
  
  return null;
};

const getLevelClassName = (level: number): string => {
  switch (level) {
    case 4: return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case 3: return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case 2: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case 1: return "bg-green-500/20 text-green-400 border-green-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export const MILE_LEVEL_DESCRIPTIONS = [
  { level: 1, male: "≤ 9:30", female: "≤ 10:30" },
  { level: 2, male: "≤ 8:00", female: "≤ 9:00" },
  { level: 3, male: "≤ 6:45", female: "≤ 7:45" },
  { level: 4, male: "≤ 5:45", female: "≤ 6:45" },
];
