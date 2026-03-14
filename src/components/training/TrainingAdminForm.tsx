import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface SessionInput {
  title: string;
  description: string;
}

const TrainingAdminForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<"program" | "workout">("workout");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("");
  const [equipment, setEquipment] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [visibility, setVisibility] = useState<"published" | "draft">("draft");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sessions, setSessions] = useState<SessionInput[]>([]);

  const addSession = () => {
    setSessions((prev) => [...prev, { title: "", description: "" }]);
  };

  const removeSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSession = (index: number, field: keyof SessionInput, value: string) => {
    setSessions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContentType("workout");
    setLevel("beginner");
    setGoal("");
    setDuration("");
    setEquipment("");
    setVideoUrl("");
    setVisibility("draft");
    setPdfFile(null);
    setSessions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) {
      toast.error("Titel ist erforderlich");
      return;
    }

    setSaving(true);

    try {
      let pdfUrl: string | null = null;

      // Upload PDF if provided
      if (pdfFile) {
        const fileExt = pdfFile.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("training-files")
          .upload(fileName, pdfFile);

        if (uploadError) throw uploadError;

        // Store just the file path, not a public URL
        pdfUrl = fileName;
      }

      // Insert content
      const { data: content, error: contentError } = await supabase
        .from("training_content")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          content_type: contentType,
          level,
          goal: goal.trim() || null,
          duration: duration.trim() || null,
          equipment: equipment.trim() || null,
          pdf_url: pdfUrl,
          video_url: videoUrl.trim() || null,
          visibility,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (contentError) throw contentError;

      // Insert sessions if program
      if (contentType === "program" && sessions.length > 0) {
        const sessionData = sessions
          .filter((s) => s.title.trim())
          .map((s, i) => ({
            program_id: content.id,
            title: s.title.trim(),
            description: s.description.trim() || null,
            sort_order: i,
          }));

        if (sessionData.length > 0) {
          const { error: sessError } = await supabase
            .from("training_sessions")
            .insert(sessionData);
          if (sessError) throw sessError;
        }
      }

      toast.success("Trainingsinhalt erstellt");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["training-content"] });
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Titel *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div>
        <Label>Beschreibung</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Typ</Label>
          <Select value={contentType} onValueChange={(v) => setContentType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="program">Programm</SelectItem>
              <SelectItem value="workout">Einzelworkout</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Level</Label>
          <Select value={level} onValueChange={(v) => setLevel(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ziel</Label>
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="z.B. Kraft, Ausdauer" />
        </div>
        <div>
          <Label>Dauer</Label>
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="z.B. 6 Wochen" />
        </div>
      </div>

      {contentType === "workout" && (
        <div>
          <Label>Equipment</Label>
          <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="z.B. Kettlebell, Klimmzugstange" />
        </div>
      )}

      <div>
        <Label>Video URL (optional)</Label>
        <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div>
        <Label>PDF Upload (optional)</Label>
        <Input
          type="file"
          accept=".pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          className="cursor-pointer"
        />
      </div>

      <div>
        <Label>Sichtbarkeit</Label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="published">Veröffentlicht</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {contentType === "program" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">Sessions</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSession}>
              <Plus className="w-4 h-4 mr-1" /> Session
            </Button>
          </div>
          {sessions.map((s, i) => (
            <div key={i} className="flex gap-2 items-start bg-secondary/50 p-3">
              <span className="text-muted-foreground text-sm mt-2 w-6">{i + 1}.</span>
              <div className="flex-1 space-y-2">
                <Input
                  value={s.title}
                  onChange={(e) => updateSession(i, "title", e.target.value)}
                  placeholder="Session-Titel"
                />
                <Input
                  value={s.description}
                  onChange={(e) => updateSession(i, "description", e.target.value)}
                  placeholder="Beschreibung (optional)"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeSession(i)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Speichern
      </Button>
    </form>
  );
};

export default TrainingAdminForm;
