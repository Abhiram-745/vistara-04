import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GroupAchievementsProps {
  groupId: string;
}

interface Achievement {
  id: string;
  achievement_key: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  requirement_type: string;
  requirement_value: number;
  unlocked: boolean;
  unlocked_at?: string;
}

export const GroupAchievements = ({ groupId }: GroupAchievementsProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [groupId]);

  const loadAchievements = async () => {
    try {
      // Get all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from("group_achievements")
        .select("*")
        .order("requirement_value");

      if (achievementsError) throw achievementsError;

      // Get unlocked achievements for this group
      const { data: unlocks, error: unlocksError } = await supabase
        .from("group_achievement_unlocks")
        .select("achievement_id, unlocked_at")
        .eq("group_id", groupId);

      if (unlocksError) throw unlocksError;

      const unlockedMap = new Map(
        unlocks?.map((u) => [u.achievement_id, u.unlocked_at]) || []
      );

      const enrichedAchievements = allAchievements?.map((ach) => ({
        ...ach,
        unlocked: unlockedMap.has(ach.id),
        unlocked_at: unlockedMap.get(ach.id),
      })) || [];

      setAchievements(enrichedAchievements);
    } catch (error: any) {
      console.error("Error loading achievements:", error);
      toast.error("Failed to load achievements");
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "bronze":
        return "bg-orange-600/20 text-orange-600 border-orange-600/30";
      case "silver":
        return "bg-gray-400/20 text-gray-600 border-gray-400/30";
      case "gold":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "platinum":
        return "bg-purple-500/20 text-purple-600 border-purple-500/30";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Group Achievements
        </CardTitle>
        <CardDescription>
          {unlockedCount} of {achievements.length} achievements unlocked
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                achievement.unlocked
                  ? "bg-card border-primary/30 shadow-sm"
                  : "bg-muted/30 border-muted opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{achievement.icon}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {achievement.name}
                        {!achievement.unlocked && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {achievement.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={getTierColor(achievement.tier)}
                    >
                      {achievement.tier}
                    </Badge>
                  </div>
                  {achievement.unlocked && achievement.unlocked_at && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Unlocked{" "}
                      {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
