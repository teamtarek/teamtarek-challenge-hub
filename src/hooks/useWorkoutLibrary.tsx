import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkoutItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  workout_number: number;
  difficulty_level: string;
  equipment_tags: string[];
  pdf_url: string | null;
  video_url: string | null;
  visibility: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  content_type: string;
  level: string;
  goal: string | null;
  duration: string | null;
  equipment: string | null;
}

export const useWorkoutLibrary = (
  subcategory?: string,
  equipmentFilter?: string[]
) => {
  return useQuery({
    queryKey: ["workout-library", subcategory, equipmentFilter],
    queryFn: async () => {
      let query = supabase
        .from("training_content")
        .select("*")
        .order("workout_number", { ascending: true });

      if (subcategory) {
        query = query.eq("subcategory", subcategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      let items = data as unknown as WorkoutItem[];

      // Client-side filter for equipment tags (array overlap)
      if (equipmentFilter && equipmentFilter.length > 0) {
        items = items.filter((item) =>
          item.equipment_tags?.some((tag: string) => equipmentFilter.includes(tag))
        );
      }

      return items;
    },
  });
};

export const useUpdateWorkout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("training_content")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-library"] });
      queryClient.invalidateQueries({ queryKey: ["training-content"] });
    },
  });
};

export const useReorderWorkouts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; workout_number: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from("training_content")
          .update({ workout_number: item.workout_number })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-library"] });
    },
  });
};
