import { Dumbbell } from "lucide-react";
import WorkoutLibrary from "@/components/training/WorkoutLibrary";

const WorkoutClubPage = () => {
  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <Dumbbell className="w-7 h-7 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold">Workout Club</h1>
      </div>
      <p className="text-muted-foreground mb-10">
        Durchsuche Workouts nach Kategorie und filtere nach Equipment.
      </p>
      <WorkoutLibrary />
    </div>
  );
};

export default WorkoutClubPage;
