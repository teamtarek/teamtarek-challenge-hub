import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateWorkout, WorkoutItem } from "@/hooks/useWorkoutLibrary";
import { WORKOUT_CATEGORIES, EQUIPMENT_TAGS, DIFFICULTY_LEVELS } from "@/lib/workoutLibrary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface WorkoutEditDialogProps {
  workout: WorkoutItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WorkoutEditDialog = ({ workout, open, onOpenChange }: WorkoutEditDialogProps) => {
  const updateMutation = useUpdateWorkout();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [workoutNumber, setWorkoutNumber] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState("beginner");
  const [equipmentTags, setEquipmentTags] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [visibility, setVisibility] = useState("draft");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workout) {
      setTitle(workout.title);
      setDescription(workout.description || "");
      setCategory(workout.category || "");
      setSubcategory(workout.subcategory || "");
      setWorkoutNumber(workout.workout_number || 0);
      setDifficultyLevel(workout.difficulty_level || workout.level || "beginner");
      setEquipmentTags(workout.equipment_tags || []);
      setVideoUrl(workout.video_url || "");
      setVisibility(workout.visibility || "draft");
      setPdfFile(null);
    }
  }, [workout]);

  const selectedCat = WORKOUT_CATEGORIES.find((c) => c.key === category);

  const toggleTag = (key: string) => {
    setEquipmentTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!workout || !title.trim()) return;
    setSaving(true);
    try {
      let pdfUrl = workout.pdf_url;

      if (pdfFile) {
        const fileExt = pdfFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("training-files")
          .upload(fileName, pdfFile);
        if (uploadError) throw uploadError;
        pdfUrl = fileName;
      }

      await updateMutation.mutateAsync({
        id: workout.id,
        updates: {
          title: title.trim(),
          description: description.trim() || null,
          category: category || null,
          subcategory: subcategory || null,
          workout_number: workoutNumber,
          difficulty_level: difficultyLevel,
          equipment_tags: equipmentTags,
          video_url: videoUrl.trim() || null,
          visibility,
          pdf_url: pdfUrl,
        },
      });

      toast.success("Workout aktualisiert");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workout bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titel *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>
                  {WORKOUT_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unterkategorie</Label>
              <Select value={subcategory} onValueChange={setSubcategory} disabled={!selectedCat}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>
                  {selectedCat?.subcategories.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Workout-Nr.</Label>
              <Input
                type="number"
                value={workoutNumber}
                onChange={(e) => setWorkoutNumber(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Schwierigkeit</Label>
              <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Equipment Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EQUIPMENT_TAGS.map((tag) => (
                <Badge
                  key={tag.key}
                  variant={equipmentTags.includes(tag.key) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleTag(tag.key)}
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Video URL</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>PDF ersetzen (optional)</Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
          </div>
          <div>
            <Label>Sichtbarkeit</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Entwurf</SelectItem>
                <SelectItem value="published">Veröffentlicht</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutEditDialog;
