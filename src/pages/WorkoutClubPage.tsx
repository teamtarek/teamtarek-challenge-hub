import { Dumbbell, Video, FileText, Lightbulb } from "lucide-react";

const SECTIONS = [
  {
    icon: Video,
    title: "Videos",
    description: "Workout-Videos und Technik-Demos von unseren Coaches.",
    soon: true,
  },
  {
    icon: FileText,
    title: "Trainingspläne",
    description: "Strukturierte Pläne für verschiedene Levels und Ziele.",
    soon: true,
  },
  {
    icon: Lightbulb,
    title: "Tipps & Wissen",
    description: "Ernährung, Recovery, Mobility und mehr.",
    soon: true,
  },
];

const WorkoutClubPage = () => {
  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Dumbbell className="w-7 h-7 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold">Workout Club</h1>
      </div>
      <p className="text-muted-foreground mb-10">
        Videos, Trainingspläne und Tipps von unseren Coaches.
      </p>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-card border border-border p-6">
            <div className="flex items-start gap-4">
              <section.icon className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  {section.soon && (
                    <span className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5">
                      Bald
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">{section.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutClubPage;
