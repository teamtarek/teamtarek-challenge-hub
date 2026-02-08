import { useState } from "react";
import { Dumbbell, Video, FileText, Lightbulb, Plus } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TrainingContentList from "@/components/training/TrainingContentList";
import TrainingAdminForm from "@/components/training/TrainingAdminForm";

const SECTIONS = [
  {
    icon: Video,
    key: "videos",
    title: "Videos",
    description: "Workout-Videos und Technik-Demos von unseren Coaches.",
    soon: true,
  },
  {
    icon: FileText,
    key: "trainingsplaene",
    title: "Trainingspläne",
    description: "Strukturierte Pläne für verschiedene Levels und Ziele.",
    soon: false,
  },
  {
    icon: Lightbulb,
    key: "tipps",
    title: "Tipps & Wissen",
    description: "Ernährung, Recovery, Mobility und mehr.",
    soon: true,
  },
];

const WorkoutClubPage = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { isAdmin, isCoach } = useUserRole();
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  const toggleSection = (key: string, soon: boolean) => {
    if (soon) return;
    setExpandedSection((prev) => (prev === key ? null : key));
  };

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
          <div key={section.key}>
            <div
              className={`bg-card border border-border p-6 ${
                !section.soon ? "cursor-pointer hover:border-primary/40 transition-colors" : ""
              }`}
              onClick={() => toggleSection(section.key, section.soon)}
            >
              <div className="flex items-start gap-4">
                <section.icon className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
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

            {/* Expanded Trainingspläne section */}
            {expandedSection === "trainingsplaene" && section.key === "trainingsplaene" && (
              <div className="border border-t-0 border-border bg-card/50 p-6">
                {(isAdmin || isCoach) && (
                  <div className="mb-4">
                    <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-1" /> Inhalt erstellen
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Trainingsinhalt erstellen</DialogTitle>
                        </DialogHeader>
                        <TrainingAdminForm />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                <TrainingContentList />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutClubPage;
