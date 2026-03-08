// Endurance level system - levels based on time and gender
// Times are in seconds

export interface MileLevel {
  level: number;
  label: string;
  className: string;
}

interface LevelThreshold {
  level: number;
  maxSeconds: number;
}

const MILE_LEVELS_MALE: LevelThreshold[] = [
  { level: 4, maxSeconds: 5 * 60 + 45 },  // ≤ 5:45
  { level: 3, maxSeconds: 6 * 60 + 45 },  // ≤ 6:45
  { level: 2, maxSeconds: 8 * 60 },        // ≤ 8:00
  { level: 1, maxSeconds: 9 * 60 + 30 },  // ≤ 9:30
];

const MILE_LEVELS_FEMALE: LevelThreshold[] = [
  { level: 4, maxSeconds: 6 * 60 + 45 },  // ≤ 6:45
  { level: 3, maxSeconds: 7 * 60 + 45 },  // ≤ 7:45
  { level: 2, maxSeconds: 9 * 60 },        // ≤ 9:00
  { level: 1, maxSeconds: 10 * 60 + 30 }, // ≤ 10:30
];

const FIVE_K_LEVELS_MALE: LevelThreshold[] = [
  { level: 4, maxSeconds: 20 * 60 },       // ≤ 20:00
  { level: 3, maxSeconds: 22 * 60 + 30 },  // ≤ 22:30
  { level: 2, maxSeconds: 26 * 60 },       // ≤ 26:00
  { level: 1, maxSeconds: 30 * 60 },       // ≤ 30:00
];

const FIVE_K_LEVELS_FEMALE: LevelThreshold[] = [
  { level: 4, maxSeconds: 22 * 60 + 30 },  // ≤ 22:30
  { level: 3, maxSeconds: 26 * 60 },       // ≤ 26:00
  { level: 2, maxSeconds: 30 * 60 },       // ≤ 30:00
  { level: 1, maxSeconds: 35 * 60 },       // ≤ 35:00
];

const TEN_K_LEVELS_MALE: LevelThreshold[] = [
  { level: 4, maxSeconds: 40 * 60 },       // ≤ 40:00
  { level: 3, maxSeconds: 45 * 60 },       // ≤ 45:00
  { level: 2, maxSeconds: 50 * 60 },       // ≤ 50:00
  { level: 1, maxSeconds: 60 * 60 },       // ≤ 60:00
];

const TEN_K_LEVELS_FEMALE: LevelThreshold[] = [
  { level: 4, maxSeconds: 43 * 60 },       // ≤ 43:00
  { level: 3, maxSeconds: 50 * 60 },       // ≤ 50:00
  { level: 2, maxSeconds: 57 * 60 },       // ≤ 57:00
  { level: 1, maxSeconds: 70 * 60 },       // ≤ 70:00
];

const getLevelsForChallenge = (challengeSlug: string, gender: string | null): LevelThreshold[] => {
  const isFemale = gender === "female";
  switch (challengeSlug) {
    case "5-kilometer-run":
      return isFemale ? FIVE_K_LEVELS_FEMALE : FIVE_K_LEVELS_MALE;
    case "10-kilometer-run":
      return isFemale ? TEN_K_LEVELS_FEMALE : TEN_K_LEVELS_MALE;
    case "the-mile":
    default:
      return isFemale ? MILE_LEVELS_FEMALE : MILE_LEVELS_MALE;
  }
};

export const getMileLevel = (timeSeconds: number, gender: string | null, challengeSlug: string = "the-mile"): MileLevel | null => {
  if (!timeSeconds || timeSeconds <= 0) return null;
  
  const levels = getLevelsForChallenge(challengeSlug, gender);
  
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

export const getLevelClassName = (level: number): string => {
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

export const FIVE_K_LEVEL_DESCRIPTIONS = [
  { level: 1, male: "≤ 30:00", female: "≤ 35:00" },
  { level: 2, male: "≤ 26:00", female: "≤ 30:00" },
  { level: 3, male: "≤ 22:30", female: "≤ 26:00" },
  { level: 4, male: "≤ 20:00", female: "≤ 22:30" },
];

export const TEN_K_LEVEL_DESCRIPTIONS = [
  { level: 1, male: "≤ 60:00", female: "≤ 70:00" },
  { level: 2, male: "≤ 50:00", female: "≤ 57:00" },
  { level: 3, male: "≤ 45:00", female: "≤ 50:00" },
  { level: 4, male: "≤ 40:00", female: "≤ 43:00" },
];

export const COMPLEX_1234_LEVEL_DESCRIPTIONS = [
  { level: 1, male: "10 Runden / 5 Min / 20 kg", female: "10 Runden / 5 Min / 12 kg" },
  { level: 2, male: "20 Runden / 10 Min / 20 kg", female: "20 Runden / 10 Min / 12 kg" },
  { level: 3, male: "30 Runden / 15 Min / 20 kg", female: "30 Runden / 15 Min / 12 kg" },
  { level: 4, male: "30 Runden / 15 Min / 24 kg", female: "30 Runden / 15 Min / 16 kg" },
];

export const MEET_BETTY_LEVEL_DESCRIPTIONS = [
  { level: 1, male: "5 Runden / 10 Min / 20 kg — Box Jumps (Höhe nach Wahl), Goblet Presses, Russian KB Swings", female: "5 Runden / 10 Min / 12 kg — Box Jumps (Höhe nach Wahl), Goblet Presses, Russian KB Swings" },
  { level: 2, male: "5 Runden / 10 Min / 24 kg — Box Jumps (60cm), SA KB Push Presses, Russian KB Swings", female: "5 Runden / 10 Min / 16 kg — Box Jumps (40cm), SA KB Push Presses, Russian KB Swings" },
  { level: 3, male: "5 Runden / 10 Min / 24 kg Presses + 32 kg Swings — Box Jumps (60cm), Double KB Push Presses, Russian KB Swings", female: "5 Runden / 10 Min / 16 kg Presses + 24 kg Swings — Box Jumps (40cm), Double KB Push Presses, Russian KB Swings" },
  { level: 4, male: "5 Runden / 10 Min / 24 kg — Box Jumps (60cm), Double KB Push Presses, Double KB Swings", female: "5 Runden / 10 Min / 16 kg — Box Jumps (40cm), Double KB Push Presses, Double KB Swings" },
];

export const RITE_OF_PASSAGE_LEVEL_DESCRIPTIONS = [
  { level: 1, male: "3 Runden Leiter 1-2-3 SA C&P + Klimmzüge / 20 kg", female: "3 Runden Leiter 1-2-3 SA C&P + Klimmzüge (Band erlaubt) / 12 kg" },
  { level: 2, male: "3 Runden Leiter 1-2-3 SA C&P + Klimmzüge / 24 kg", female: "3 Runden Leiter 1-2-3 SA C&P + Klimmzüge (Band erlaubt) / 16 kg" },
  { level: 3, male: "5 Runden Leiter 1-2-3-4-5 SA C&P + Klimmzüge / 24 kg", female: "5 Runden Leiter 1-2-3-4-5 SA C&P + Klimmzüge / 16 kg" },
  { level: 4, male: "5 Runden Leiter 1-2-3-4-5 SA C&P + Klimmzüge / 50% BW", female: "5 Runden Leiter 1-2-3-4-5 SA C&P + Klimmzüge / 33% BW" },
];

export const SIMPLE_SINISTER_LEVEL_DESCRIPTIONS = [
  { level: 1, male: "20 kg / 20 Min", female: "12 kg / 20 Min" },
  { level: 2, male: "24 kg / 20 Min", female: "16 kg / 20 Min" },
  { level: 3, male: "32 kg / 20 Min (Simple-Standard)", female: "24 kg / 20 Min (Simple-Standard)" },
  { level: 4, male: "48 kg / 20 Min (Sinister-Standard)", female: "32 kg / 20 Min (Sinister-Standard)" },
];

export const QUADRANT_LEVEL_DESCRIPTIONS = [
  { level: 3, male: "10 Runden / 20 Min / 20 kg", female: "10 Runden / 20 Min / 12 kg" },
  { level: 4, male: "10 Runden / 20 Min / 24 kg", female: "10 Runden / 20 Min / 16 kg" },
];

// Calculate Quadrant level from result data
export const getQuadrantLevel = (timeSeconds: number, weightKg: number, gender: string | null): MileLevel | null => {
  if (!timeSeconds || timeSeconds <= 0 || !weightKg || weightKg <= 0) return null;
  const isFemale = gender === "female";

  if (timeSeconds > 20 * 60) return null; // Must be within 20 minutes

  // Level 4: 24kg(M)/16kg(F)
  const l4Weight = isFemale ? 16 : 24;
  if (weightKg >= l4Weight) {
    return { level: 4, label: "Level 4", className: getLevelClassName(4) };
  }
  // Level 3: 20kg(M)/12kg(F)
  const l3Weight = isFemale ? 12 : 20;
  if (weightKg >= l3Weight) {
    return { level: 3, label: "Level 3", className: getLevelClassName(3) };
  }

  return null;
};

export const CLASSIC_COMPLEX_LEVEL_DESCRIPTIONS = [
  { level: 1, male: "10 Runden / 20 kg", female: "10 Runden / 12 kg" },
  { level: 2, male: "12 Runden / 20 kg", female: "12 Runden / 12 kg" },
  { level: 3, male: "12 Runden / 24 kg", female: "12 Runden / 16 kg" },
  { level: 4, male: "12 Runden / 32 kg", female: "12 Runden / 24 kg" },
];

// Calculate Classic Complex level from result data
export const getClassicComplexLevel = (rounds: number, weightKg: number, gender: string | null): MileLevel | null => {
  if (!rounds || rounds <= 0 || !weightKg || weightKg <= 0) return null;
  const isFemale = gender === "female";

  // Level 4: 12 rounds, 32kg(M)/24kg(F)
  if (rounds >= 12 && weightKg >= (isFemale ? 24 : 32)) {
    return { level: 4, label: "Level 4", className: getLevelClassName(4) };
  }
  // Level 3: 12 rounds, 24kg(M)/16kg(F)
  if (rounds >= 12 && weightKg >= (isFemale ? 16 : 24)) {
    return { level: 3, label: "Level 3", className: getLevelClassName(3) };
  }
  // Level 2: 12 rounds, 20kg(M)/12kg(F)
  if (rounds >= 12 && weightKg >= (isFemale ? 12 : 20)) {
    return { level: 2, label: "Level 2", className: getLevelClassName(2) };
  }
  // Level 1: 10 rounds, 20kg(M)/12kg(F)
  if (rounds >= 10 && weightKg >= (isFemale ? 12 : 20)) {
    return { level: 1, label: "Level 1", className: getLevelClassName(1) };
  }

  return null;
};

export const SNATCH_TEST_INFO = {
  "5-minute-snatch-test": "Der 5-Minute Snatch Test ist eine reine Level 3 Challenge.",
  "secret-service-snatch-test": "Der Secret Service Snatch Test (10 Min) ist eine reine Level 4 Challenge.",
};

// Calculate 1-2-3-4 Complex level from result data
export const getComplexLevel = (rounds: number, timeSeconds: number, weightKg: number, gender: string | null): MileLevel | null => {
  if (!rounds || rounds <= 0 || !timeSeconds || timeSeconds <= 0 || !weightKg || weightKg <= 0) return null;
  const isFemale = gender === "female";

  // Check from highest level down
  // Level 4: 30 rounds, 15 min, 24kg(M)/16kg(F)
  const l4Weight = isFemale ? 16 : 24;
  if (rounds >= 30 && timeSeconds <= 15 * 60 && weightKg >= l4Weight) {
    return { level: 4, label: "Level 4", className: getLevelClassName(4) };
  }
  // Level 3: 30 rounds, 15 min, 20kg(M)/12kg(F)
  const l3Weight = isFemale ? 12 : 20;
  if (rounds >= 30 && timeSeconds <= 15 * 60 && weightKg >= l3Weight) {
    return { level: 3, label: "Level 3", className: getLevelClassName(3) };
  }
  // Level 2: 20 rounds, 10 min, 20kg(M)/12kg(F)
  if (rounds >= 20 && timeSeconds <= 10 * 60 && weightKg >= l3Weight) {
    return { level: 2, label: "Level 2", className: getLevelClassName(2) };
  }
  // Level 1: 10 rounds, 5 min, 20kg(M)/12kg(F)
  if (rounds >= 10 && timeSeconds <= 5 * 60 && weightKg >= l3Weight) {
    return { level: 1, label: "Level 1", className: getLevelClassName(1) };
  }

  return null;
};


