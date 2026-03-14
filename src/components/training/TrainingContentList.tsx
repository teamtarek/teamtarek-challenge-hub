import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrainingContent, useDeleteTrainingContent } from "@/hooks/useTrainingContent";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Video, Trash2, ExternalLink, Dumbbell, Clock, Target, Wrench } from "lucide-react";
import { toast } from "sonner";
import ProgramDetail from "./ProgramDetail";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const TrainingContentList = () => {
  const [contentType, setContentType] = useState<"program" | "workout" | undefined>(undefined);
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  const { data: content, isLoading } = useTrainingContent(contentType, levelFilter);
  const { isAdmin, isCoach } = useUserRole();
  const deleteMutation = useDeleteTrainingContent();

  const handleDelete = async (id: string) => {
    if (!confirm("Diesen Inhalt wirklich löschen?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  if (selectedProgram) {
    return (
      <ProgramDetail
        programId={selectedProgram}
        onBack={() => setSelectedProgram(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={contentType ?? "all"} onValueChange={(v) => setContentType(v === "all" ? undefined : (v as any))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Alle Typen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="program">Programme</SelectItem>
            <SelectItem value="workout">Einzelworkouts</SelectItem>
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Alle Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Level</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !content || content.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Noch keine Inhalte vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {content.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border p-5 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5">
                      {item.content_type === "program" ? "Programm" : "Workout"}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5">
                      {LEVEL_LABELS[item.level]}
                    </span>
                    {isAdmin && item.visibility === "draft" && (
                      <span className="text-xs uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5">
                        Entwurf
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {item.goal && (
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" /> {item.goal}
                      </span>
                    )}
                    {item.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.duration}
                      </span>
                    )}
                    {item.equipment && (
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> {item.equipment}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.pdf_url && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={item.pdf_url} target="_blank" rel="noopener noreferrer">
                        <FileText className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {item.video_url && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={item.video_url} target="_blank" rel="noopener noreferrer">
                        <Video className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {item.content_type === "program" && (
                    <Button variant="outline" size="sm" onClick={() => setSelectedProgram(item.id)}>
                      Öffnen
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingContentList;
