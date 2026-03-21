import { useState } from "react";
import { Dumbbell, Library, Video, Lightbulb } from "lucide-react";
import WorkoutLibrary from "@/components/training/WorkoutLibrary";

type Section = "library" | "videos" | "tips";

const SECTIONS: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: "library", label: "Workout Library", icon: Library },
  { key: "videos", label: "Videos", icon: Video },
  { key: "tips", label: "Tipps & Wissen", icon: Lightbulb },
];

const CATEGORIES = [
  "Alle", "Kettlebell", "Strength", "Conditioning",
  "Running", "Mobility", "Recovery", "Ernährung"
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
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
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
      {activeSection === "videos" && <VideosSection />}
      {activeSection === "tips" && <TipsSection />}
    </div>
  );
};

// --- Videos Section ---
const VideosSection = () => {
  const [activeCategory, setActiveCategory] = useState("Alle");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Noch keine Videos vorhanden</p>
        <p className="text-sm mt-1">Videos werden vom Coach hier hinterlegt.</p>
      </div>
    </div>
  );
};

// --- Tips Section ---
const TipsSection = () => {
  const [activeCategory, setActiveCategory] = useState("Alle");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Noch keine Tipps vorhanden</p>
        <p className="text-sm mt-1">Tipps & Wissen werden vom Coach hier hinterlegt.</p>
      </div>
    </div>
  );
};

export default WorkoutClubPage;
