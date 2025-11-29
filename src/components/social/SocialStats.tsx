import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Target, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SocialStatsProps {
  userId: string;
}

const SocialStats = ({ userId }: SocialStatsProps) => {
  const [stats, setStats] = useState({
    totalHours: 0,
    totalSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    friendsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      // Get study streaks
      const { data: streaks, error: streaksError } = await supabase
        .from("study_streaks")
        .select("*")
        .eq("user_id", userId);

      if (streaksError) throw streaksError;

      const totalMinutes = streaks?.reduce((sum, s) => sum + s.minutes_studied, 0) || 0;
      const totalSessions = streaks?.reduce((sum, s) => sum + s.sessions_completed, 0) || 0;

      // Calculate current streak
      const sortedDates = streaks?.map(s => new Date(s.date)).sort((a, b) => b.getTime() - a.getTime()) || [];
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sortedDates.length; i++) {
        const streakDate = new Date(sortedDates[i]);
        streakDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - streakDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === i) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0 || Math.abs(sortedDates[i].getTime() - sortedDates[i-1].getTime()) <= 86400000) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      // Get friends count
      const { data: friendships, error: friendsError } = await supabase
        .from("friendships")
        .select("id")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq("status", "accepted");

      if (friendsError) throw friendsError;

      setStats({
        totalHours: Math.floor(totalMinutes / 60),
        totalSessions,
        currentStreak,
        longestStreak,
        friendsCount: friendships?.length || 0
      });
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Your Statistics
          </CardTitle>
          <CardDescription>
            Track your study progress and achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl border border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total Study Time</p>
              </div>
              <p className="text-3xl font-bold text-primary">{stats.totalHours}h</p>
              <p className="text-xs text-muted-foreground mt-1">Across all sessions</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 rounded-xl border border-blue-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
              </div>
              <p className="text-3xl font-bold text-blue-500">{stats.totalSessions}</p>
              <p className="text-xs text-muted-foreground mt-1">Study sessions completed</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-6 rounded-xl border border-orange-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
              </div>
              <p className="text-3xl font-bold text-orange-500">{stats.currentStreak}</p>
              <p className="text-xs text-muted-foreground mt-1">Days in a row</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 rounded-xl border border-green-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Longest Streak</p>
              </div>
              <p className="text-3xl font-bold text-green-500">{stats.longestStreak}</p>
              <p className="text-xs text-muted-foreground mt-1">Best performance</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Friends</p>
              </div>
              <p className="text-3xl font-bold text-purple-500">{stats.friendsCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Study buddies</p>
            </div>

            <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-6 rounded-xl border border-pink-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <Clock className="h-5 w-5 text-pink-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Session</p>
              </div>
              <p className="text-3xl font-bold text-pink-500">
                {stats.totalSessions > 0 ? Math.round((stats.totalHours * 60) / stats.totalSessions) : 0}m
              </p>
              <p className="text-xs text-muted-foreground mt-1">Per session</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialStats;
