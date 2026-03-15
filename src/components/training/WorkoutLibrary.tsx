import { useState } from "react";
import { useWorkoutLibrary, useUnassignedWorkouts, WorkoutItem } from "@/hooks/useWorkoutLibrary";
import { useDeleteTrainingContent } from "@/hooks/useTrainingContent";
import { useUserRole } from "@/hooks/useUserRole";
import { WORKOUT_CATEGORIES, getSubcategoryLabel, getCategoryLabel } from "@/lib/workoutLibrary";
import EquipmentFilter from "./EquipmentFilter";
import WorkoutCard from "./WorkoutCard";
import WorkoutEditDialog from "./WorkoutEditDialog";
import WorkoutCreateDialog from "./WorkoutCreateDialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

const WorkoutLibrary = () => {
  const { isAdmin, isCoach } = useUserRole();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: workouts, isLoading } = useWorkoutLibrary(
    selectedSubcategory ?? undefined,
    equipmentFilter.length > 0 ? equipmentFilter : undefined
  );
  const deleteMutation = useDeleteTrainingContent();
  const { data: unassignedWorkouts } = useUnassignedWorkouts();

  const handleDelete = async (id: string) => {
    if (!confirm("Dieses Workout wirklich löschen?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Workout gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const activeCat = WORKOUT_CATEGORIES.find((c) => c.key === selectedCategory);

  // Category selection view
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        {(isAdmin || isCoach) && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Workout erstellen
          </Button>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {WORKOUT_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className="bg-card border border-border p-5 text-left hover:border-primary/40 transition-colors group"
            >
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {cat.label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {cat.subcategories.map((s) => s.label).join(" · ")}
              </p>
            </button>
          ))}
        </div>
        {(isAdmin || isCoach) && unassignedWorkouts && unassignedWorkouts.length > 0 && (
          <div className="border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <h3 className="font-semibold text-destructive flex items-center gap-2">
              ⚠️ Nicht zugewiesene Workouts ({unassignedWorkouts.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Diese Workouts haben keine Kategorie und erscheinen nicht in der Library. Klicke auf „Bearbeiten", um sie zuzuweisen.
            </p>
            <div className="space-y-2">
              {unassignedWorkouts.map((w) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  isAdmin={true}
                  onEdit={setEditingWorkout}
                  onDelete={handleDelete}
                  showDragHandle={false}
                />
              ))}
            </div>
          </div>
        )}
        <WorkoutCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    );
  }

  // Subcategory selection view
  if (!selectedSubcategory && activeCat) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Alle Kategorien
        </Button>
        <h2 className="text-xl font-bold">{activeCat.label}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {activeCat.subcategories.map((sub) => (
            <button
              key={sub.key}
              onClick={() => setSelectedSubcategory(sub.key)}
              className="bg-card border border-border p-5 text-left hover:border-primary/40 transition-colors"
            >
              <h3 className="font-semibold">{sub.label}</h3>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Workout list view
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSubcategory(null)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> {activeCat?.label}
        </Button>
        <h2 className="text-xl font-bold">
          {selectedSubcategory ? getSubcategoryLabel(selectedSubcategory) : ""}
        </h2>
      </div>

      {(isAdmin || isCoach) && (
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Workout erstellen
        </Button>
      )}

      <EquipmentFilter selected={equipmentFilter} onChange={setEquipmentFilter} />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !workouts || workouts.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Noch keine Workouts in dieser Kategorie.
        </p>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              isAdmin={isAdmin || isCoach}
              onEdit={setEditingWorkout}
              onDelete={handleDelete}
              showDragHandle={isAdmin}
            />
          ))}
        </div>
      )}

      <WorkoutEditDialog
        workout={editingWorkout}
        open={!!editingWorkout}
        onOpenChange={(open) => !open && setEditingWorkout(null)}
      />
      <WorkoutCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultCategory={selectedCategory ?? undefined}
        defaultSubcategory={selectedSubcategory ?? undefined}
      />
    </div>
  );
};

export default WorkoutLibrary;
