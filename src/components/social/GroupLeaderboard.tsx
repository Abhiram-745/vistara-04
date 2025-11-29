import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GroupLeaderboardEntry {
  group_id: string;
  group_name: string;
  total_hours: number;
  member_count: number;
  challenge_goal: number;
}

export const GroupLeaderboard = () => {
  const [entries, setEntries] = useState<GroupLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroupLeaderboard();
  }, []);

  const loadGroupLeaderboard = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get all groups
      const { data: groups, error: groupsError } = await supabase
        .from("study_groups")
        .select("id, name");

      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Get members for each group
      const { data: allMembers } = await supabase
        .from("group_members")
        .select("group_id, user_id");

      // Get challenges
      const { data: challenges } = await supabase
        .from("group_challenges")
        .select("group_id, daily_hours_goal");

      // Get today's study sessions
      const { data: streaks } = await supabase
        .from("study_streaks")
        .select("user_id, minutes_studied")
        .eq("date", today);

      // Calculate stats per group
      const groupStats = groups.map(group => {
        const members = allMembers?.filter(m => m.group_id === group.id) || [];
        const memberIds = members.map(m => m.user_id);
        const challenge = challenges?.find(c => c.group_id === group.id);
        
        const groupStreaks = streaks?.filter(s => memberIds.includes(s.user_id)) || [];
        const totalMinutes = groupStreaks.reduce((sum, s) => sum + s.minutes_studied, 0);

        return {
          group_id: group.id,
          group_name: group.name,
          total_hours: totalMinutes / 60,
          member_count: members.length,
          challenge_goal: challenge?.daily_hours_goal || 0,
        };
      });

      // Sort by total hours and take top 10
      const sortedGroups = groupStats
        .sort((a, b) => b.total_hours - a.total_hours)
        .slice(0, 10);

      setEntries(sortedGroups);
    } catch (error: any) {
      console.error("Error loading group leaderboard:", error);
      toast.error("Failed to load group leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-orange-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>;
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

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Users className="h-6 w-6 text-primary" />
          Top Study Groups
        </CardTitle>
        <CardDescription>
          Leading groups today (sorted by total study hours)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No groups with study activity yet!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => {
              const goalAchieved = entry.challenge_goal > 0 && entry.total_hours >= entry.challenge_goal;
              return (
                <div
                  key={entry.group_id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    goalAchieved
                      ? "bg-green-500/10 ring-2 ring-green-500/50"
                      : "bg-muted/50 hover:bg-muted"
                  } ${index < 3 ? "shadow-md" : ""}`}
                >
                  <div className="flex items-center justify-center w-10">
                    {getRankIcon(index)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{entry.group_name}</p>
                      {goalAchieved && (
                        <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded-full">
                          Goal Achieved! 🎉
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {entry.member_count} members
                      </span>
                      {entry.challenge_goal > 0 && (
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Goal: {entry.challenge_goal}h
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {entry.total_hours.toFixed(1)}h
                    </p>
                    <p className="text-xs text-muted-foreground">today</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
