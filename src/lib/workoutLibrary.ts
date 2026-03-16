export const WORKOUT_CATEGORIES = [
  {
    key: "hybrid",
    label: "Hybrid Training",
    subcategories: [
      { key: "hybrid-beginner", label: "Hybrid Beginner" },
      { key: "hybrid-intermediate", label: "Hybrid Intermediate" },
      { key: "hybrid-performance", label: "Hybrid Performance" },
    ],
  },
  {
    key: "strength",
    label: "Strength Training",
    subcategories: [
      { key: "kettlebell-only", label: "Kettlebell Only" },
      { key: "dumbbell-only", label: "Dumbbell Only" },
      { key: "full-gym", label: "Full Gym" },
      { key: "bodyweight-only", label: "Bodyweight Only" },
    ],
  },
  {
    key: "conditioning",
    label: "Conditioning",
    subcategories: [
      { key: "endurance-only", label: "Endurance Only" },
      { key: "hiit", label: "HIIT" },
      { key: "mixed-modal", label: "Mixed Modal Aerobics" },
    ],
  },
  {
    key: "movement",
    label: "Movement",
    subcategories: [
      { key: "mobility", label: "Mobility" },
    ],
  },
  {
    key: "benchmarks",
    label: "Benchmarks",
    subcategories: [
      { key: "benchmark-workouts", label: "Benchmark Workouts" },
      { key: "standards", label: "Standards" },
    ],
  },
  {
    key: "programs",
    label: "Programs",
    subcategories: [
      { key: "strength-programs", label: "Strength Programs" },
      { key: "running-programs", label: "Running Programs" },
      { key: "hybrid-programs", label: "Hybrid Programs" },
    ],
  },
] as const;

export const EQUIPMENT_TAGS = [
  { key: "kettlebell", label: "Kettlebell" },
  { key: "dumbbell", label: "Dumbbell" },
  { key: "pull-up-bar", label: "Pull-up Bar" },
  { key: "resistance-bands", label: "Resistance Bands" },
  { key: "barbell", label: "Barbell" },
  { key: "rowing-machine", label: "Rowing Machine" },
  { key: "jump-rope", label: "Jump Rope" },
  { key: "bodyweight", label: "Bodyweight" },
  { key: "running", label: "Running" },
  { key: "bench", label: "Bench" },
] as const;

export const DIFFICULTY_LEVELS = [
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
] as const;

export type WorkoutCategory = typeof WORKOUT_CATEGORIES[number]["key"];
export type WorkoutSubcategory = typeof WORKOUT_CATEGORIES[number]["subcategories"][number]["key"];
export type EquipmentTag = typeof EQUIPMENT_TAGS[number]["key"];
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number]["key"];

export const getCategoryLabel = (key: string) =>
  WORKOUT_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export const getSubcategoryLabel = (key: string) => {
  for (const cat of WORKOUT_CATEGORIES) {
    const sub = cat.subcategories.find((s) => s.key === key);
    if (sub) return sub.label;
  }
  return key;
};

export const getEquipmentLabel = (key: string) =>
  EQUIPMENT_TAGS.find((t) => t.key === key)?.label ?? key;
