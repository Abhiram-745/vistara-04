import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useTourReset = () => {
  const resetAllTours = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Clear all tour completion data
    localStorage.removeItem(`tour_completed_${user.id}`);
    toast.success("All tutorials have been reset. Navigate to any section to see the tour again!");
  };

  const resetSpecificTour = async (tourKey: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const completedTours = localStorage.getItem(`tour_completed_${user.id}`) || "{}";
    const tourStatus = JSON.parse(completedTours);
    delete tourStatus[tourKey];
    localStorage.setItem(`tour_completed_${user.id}`, JSON.stringify(tourStatus));
    
    toast.success(`${tourKey} tutorial has been reset!`);
  };

  return { resetAllTours, resetSpecificTour };
};
