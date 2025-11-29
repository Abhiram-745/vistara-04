import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Award, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerConfetti, triggerEmoji } from "@/utils/celebrations";

export const CheckAchievementsButton = () => {
  const [loading, setLoading] = useState(false);

  const handleCheckAchievements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-group-achievements', {
        body: { time: new Date().toISOString() },
      });

      if (error) throw error;

      // Trigger celebration if achievements were awarded
      if (data.achievementsAwarded > 0) {
        triggerConfetti('achievement');
        triggerEmoji('🏆');
      }

      toast.success(
        `Achievement check complete! ${data.achievementsAwarded || 0} new achievements awarded.`,
        {
          description: `Processed ${data.groupsProcessed || 0} groups, recorded ${data.completionsRecorded || 0} completions.`,
        }
      );
    } catch (error: any) {
      console.error('Error checking achievements:', error);
      toast.error('Failed to check achievements', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCheckAchievements}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Award className="h-4 w-4" />
      )}
      Check Achievements Now
    </Button>
  );
};
