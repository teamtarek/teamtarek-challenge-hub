import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutItem } from "@/hooks/useWorkoutLibrary";
import { getEquipmentLabel, getCategoryLabel, getSubcategoryLabel } from "@/lib/workoutLibrary";
import { DIFFICULTY_LEVELS } from "@/lib/workoutLibrary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Video, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface WorkoutCardProps {
  workout: WorkoutItem;
  isAdmin: boolean;
  onEdit: (workout: WorkoutItem) => void;
  onDelete: (id: string) => void;
  showDragHandle?: boolean;
  showCategory?: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-700 dark:text-green-400",
  intermediate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  advanced: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const WorkoutCard = ({ workout, isAdmin, onEdit, onDelete, showDragHandle, showCategory }: WorkoutCardProps) => {
  const handlePdfClick = async () => {
    if (!workout.pdf_url) return;
    const filePath = workout.pdf_url.includes("/training-files/")
      ? workout.pdf_url.split("/training-files/").pop()!
      : workout.pdf_url;
    const { data, error } = await supabase.storage
      .from("training-files")
      .createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Datei konnte nicht geladen werden");
    }
  };

  const difficultyLevel = workout.difficulty_level || workout.level || "beginner";
  const diffLabel = DIFFICULTY_LEVELS.find((d) => d.key === difficultyLevel)?.label ?? difficultyLevel;

  return (
    <div className="bg-card border border-border p-4 space-y-2 group">
      <div className="flex items-start gap-3">
        {showDragHandle && (
          <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-grab flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {workout.workout_number > 0 && (
              <span className="text-xs font-mono text-muted-foreground">
                #{workout.workout_number}
              </span>
            )}
            <h3 className="font-semibold">{workout.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-sm ${DIFFICULTY_COLORS[difficultyLevel] || ""}`}>
              {diffLabel}
            </span>
            {workout.visibility === "draft" && isAdmin && (
              <span className="text-xs uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5">
                Entwurf
              </span>
            )}
          </div>
          {workout.description && (
            <p className="text-sm text-muted-foreground mt-1">{workout.description}</p>
          )}
          {workout.equipment_tags && workout.equipment_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {workout.equipment_tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {getEquipmentLabel(tag)}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {workout.pdf_url && (
            <Button variant="ghost" size="icon" onClick={handlePdfClick} title="PDF öffnen">
              <FileText className="w-4 h-4" />
            </Button>
          )}
          {workout.video_url && (
            <Button variant="ghost" size="icon" asChild title="Video öffnen">
              <a href={workout.video_url} target="_blank" rel="noopener noreferrer">
                <Video className="w-4 h-4" />
              </a>
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="ghost" size="icon" onClick={() => onEdit(workout)} title="Bearbeiten">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(workout.id)} title="Löschen">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutCard;
