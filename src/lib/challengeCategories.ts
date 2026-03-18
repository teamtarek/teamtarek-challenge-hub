export const CHALLENGE_SECTIONS = [
  { key: "outdoor", label: "Outdoor Community Challenges" },
  { key: "gym", label: "Gym Community Challenges" },
  { key: "gym-benchmark", label: "Benchmark Workouts — Gym" },
  { key: "kettlebell", label: "Benchmark Workouts — Kettlebell" },
  { key: "endurance", label: "Benchmark Workouts — Endurance" },
] as const;

export type ChallengeCategoryKey = typeof CHALLENGE_SECTIONS[number]["key"];
