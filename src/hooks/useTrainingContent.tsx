import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TrainingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: "program" | "workout";
  level: "beginner" | "intermediate" | "advanced";
  goal: string | null;
  duration: string | null;
  equipment: string | null;
  pdf_url: string | null;
  video_url: string | null;
  visibility: "published" | "draft";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  program_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface SessionProgress {
  id: string;
  user_id: string;
  session_id: string;
  completed_at: string;
}

export const useTrainingContent = (contentType?: "program" | "workout", level?: string) => {
  return useQuery({
    queryKey: ["training-content", contentType, level],
    queryFn: async () => {
      let query = supabase
        .from("training_content")
        .select("*")
        .order("created_at", { ascending: false });

      if (contentType) {
        query = query.eq("content_type", contentType);
      }
      if (level && level !== "all") {
        query = query.eq("level", level);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrainingContent[];
    },
  });
};

export const useTrainingSessions = (programId: string | null) => {
  return useQuery({
    queryKey: ["training-sessions", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("program_id", programId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as TrainingSession[];
    },
    enabled: !!programId,
  });
};

export const useSessionProgress = (programId: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["session-progress", programId, user?.id],
    queryFn: async () => {
      if (!user || !programId) return [];
      // First get session IDs for this program
      const { data: sessions } = await supabase
        .from("training_sessions")
        .select("id")
        .eq("program_id", programId);
      if (!sessions || sessions.length === 0) return [];

      const sessionIds = sessions.map((s) => s.id);
      const { data, error } = await supabase
        .from("user_session_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("session_id", sessionIds);
      if (error) throw error;
      return data as SessionProgress[];
    },
    enabled: !!user && !!programId,
  });
};

export const useToggleSessionComplete = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, isCompleted }: { sessionId: string; isCompleted: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from("user_session_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("session_id", sessionId);
        if (error) throw error;
      } else {
        // Mark complete
        const { error } = await supabase
          .from("user_session_progress")
          .insert({ user_id: user.id, session_id: sessionId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-progress"] });
    },
  });
};

export const useDeleteTrainingContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("training_content")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-content"] });
    },
  });
};
