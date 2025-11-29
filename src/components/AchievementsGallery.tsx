import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tier: string;
  criteria_value: number;
  xp_reward: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
  progress: number;
}

export const AchievementsGallery = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .order('tier', { ascending: true });

      const { data: userAchData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (achievementsData) setAchievements(achievementsData);
      if (userAchData) setUserAchievements(userAchData);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getProgress = (achievementId: string) => {
    const userAch = userAchievements.find(ua => ua.achievement_id === achievementId);
    return userAch?.progress || 0;
  };

  const tierColors = {
    bronze: "border-amber-700 bg-amber-950/20",
    silver: "border-slate-400 bg-slate-950/20",
    gold: "border-yellow-400 bg-yellow-950/20",
    platinum: "border-cyan-400 bg-cyan-950/20"
  };

  const filteredAchievements = selectedCategory === "all"
    ? achievements
    : achievements.filter(a => a.category === selectedCategory);

  const categories = ["all", "streak", "study_time", "completion", "social", "mastery"];

  if (loading) {
    return <div className="text-center py-8">Loading achievements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Achievements</h2>
          <p className="text-muted-foreground">
            {userAchievements.length} / {achievements.length} unlocked
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span>{userAchievements.reduce((sum, ua) => {
            const ach = achievements.find(a => a.id === ua.achievement_id);
            return sum + (ach?.xp_reward || 0);
          }, 0)} Total XP Earned</span>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat === "all" ? "All" : cat.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map(achievement => {
              const unlocked = isUnlocked(achievement.id);
              const progress = getProgress(achievement.id);
              const progressPercent = (progress / achievement.criteria_value) * 100;

              return (
                <Card
                  key={achievement.id}
                  className={`p-6 transition-all ${
                    unlocked
                      ? `${tierColors[achievement.tier as keyof typeof tierColors]} border-2`
                      : "opacity-50 bg-muted"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-5xl ${unlocked ? "" : "grayscale opacity-30"}`}>
                      {unlocked ? achievement.icon : <Lock className="w-12 h-12" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground truncate">
                          {achievement.name}
                        </h3>
                        <Badge variant="outline" className="text-xs capitalize">
                          {achievement.tier}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {achievement.description}
                      </p>
                      
                      {!unlocked && progress > 0 && (
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {progress} / {achievement.criteria_value}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs font-semibold text-primary mt-2">
                        +{achievement.xp_reward} XP
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
