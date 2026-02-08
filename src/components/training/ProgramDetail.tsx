import { useTrainingSessions, useSessionProgress, useToggleSessionComplete } from "@/hooks/useTrainingContent";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProgramDetailProps {
  programId: string;
  onBack: () => void;
}

const ProgramDetail = ({ programId, onBack }: ProgramDetailProps) => {
  const { data: sessions, isLoading: sessionsLoading } = useTrainingSessions(programId);
  const { data: progress, isLoading: progressLoading } = useSessionProgress(programId);
  const toggleMutation = useToggleSessionComplete();

  const completedIds = new Set(progress?.map((p) => p.session_id) ?? []);
  const totalSessions = sessions?.length ?? 0;
  const completedCount = sessions?.filter((s) => completedIds.has(s.id)).length ?? 0;

  const handleToggle = (sessionId: string) => {
    const isCompleted = completedIds.has(sessionId);
    toggleMutation.mutate(
      { sessionId, isCompleted },
      {
        onError: () => toast.error("Fehler beim Aktualisieren"),
      }
    );
  };

  const isLoading = sessionsLoading || progressLoading;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
      </Button>

      {totalSessions > 0 && (
        <div className="text-sm text-muted-foreground">
          Fortschritt: {completedCount} / {totalSessions} Sessions
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Keine Sessions vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const done = completedIds.has(session.id);
            return (
              <div
                key={session.id}
                className={`flex items-start gap-3 p-4 border border-border ${
                  done ? "bg-primary/5 border-primary/20" : "bg-card"
                }`}
              >
                <Checkbox
                  checked={done}
                  onCheckedChange={() => handleToggle(session.id)}
                  disabled={toggleMutation.isPending}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                    {session.title}
                  </p>
                  {session.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{session.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgramDetail;
