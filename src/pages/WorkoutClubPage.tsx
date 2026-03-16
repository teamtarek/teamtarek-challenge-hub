import { useState } from "react";
import { Dumbbell, Library, Video, Lightbulb } from "lucide-react";
import WorkoutLibrary from "@/components/training/WorkoutLibrary";

type Section = "library" | "videos" | "tips";

const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "library", label: "Workout Library", icon: Library },
  { key: "videos", label: "Videos", icon: Video },
  { key: "tips", label: "Tipps & Wissen", icon: Lightbulb },
];

const WorkoutClubPage = () => {
  const [activeSection, setActiveSection] = useState<Section>("library");

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <Dumbbell className="w-7 h-7 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold">Workout Club</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Dein Zugang zu Workouts, Trainingsplänen, Videos und Wissen.
      </p>

      {/* Section Navigation */}
      <div className="flex gap-2 flex-wrap mb-8">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border transition-colors ${
              activeSection === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      {activeSection === "library" && <WorkoutLibrary />}
      {activeSection === "plans" && <TrainingContentList />}
      {activeSection === "videos" && (
        <div className="text-center py-16 text-muted-foreground">
          <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Videos – Coming Soon</p>
          <p className="text-sm mt-1">Hier findest du bald Trainingsvideos und Tutorials.</p>
        </div>
      )}
      {activeSection === "tips" && (
        <div className="text-center py-16 text-muted-foreground">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Tipps & Wissen – Coming Soon</p>
          <p className="text-sm mt-1">Hier findest du bald Tipps, Guides und Fachwissen rund ums Training.</p>
        </div>
      )}
    </div>
  );
};

export default WorkoutClubPage;
