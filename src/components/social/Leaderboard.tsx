import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Flame, Target, Loader2, Medal } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  total_minutes: number;
  total_sessions: number;
  current_streak: number;
}

interface LeaderboardProps {
  userId: string;
}

const Leaderboard = ({ userId }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [userId]);

  const loadLeaderboard = async () => {
    try {
      // Get all study streaks from all users
      const { data: streaks, error: streaksError } = await supabase
        .from("study_streaks")
        .select("user_id, minutes_studied, sessions_completed, date");

      if (streaksError) throw streaksError;

      // Get unique user IDs
      const userIds = Array.from(new Set(streaks?.map(s => s.user_id) || []));
      
      if (userIds.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Get profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Calculate stats per user
      const userStats = new Map<string, LeaderboardEntry>();

      userIds.forEach(uid => {
        const profile = profiles?.find(p => p.id === uid);
        const userStreaks = streaks?.filter(s => s.user_id === uid) || [];
        
        // Calculate total minutes and sessions
        const totalMinutes = userStreaks.reduce((sum, s) => sum + s.minutes_studied, 0);
        const totalSessions = userStreaks.reduce((sum, s) => sum + s.sessions_completed, 0);
        
        // Calculate current streak
        const sortedDates = userStreaks.map(s => new Date(s.date)).sort((a, b) => b.getTime() - a.getTime());
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

        userStats.set(uid, {
          user_id: uid,
          full_name: profile?.full_name || "Unknown",
          avatar_url: profile?.avatar_url || undefined,
          total_minutes: totalMinutes,
          total_sessions: totalSessions,
          current_streak: currentStreak
        });
      });

      // Sort by total minutes and take top 10
      const sortedEntries = Array.from(userStats.values())
        .sort((a, b) => b.total_minutes - a.total_minutes)
        .slice(0, 10);

      setEntries(sortedEntries);
    } catch (error: any) {
      console.error("Error loading leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
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
          <Trophy className="h-6 w-6 text-primary" />
          Top 10 Students
        </CardTitle>
        <CardDescription>
          See how you rank against all students globally
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Start studying to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  entry.user_id === userId
                    ? "bg-primary/10 ring-2 ring-primary/50"
                    : "bg-muted/50 hover:bg-muted"
                } ${index < 3 ? "shadow-md" : ""}`}
              >
                <div className="flex items-center justify-center w-10">
                  {getRankIcon(index)}
                </div>

                <Avatar className={`h-12 w-12 ${index < 3 ? "ring-2 ring-primary/30" : ""}`}>
                  <AvatarImage src={entry.avatar_url} />
                  <AvatarFallback className={index === 0 ? "bg-gradient-primary text-white" : ""}>
                    {getInitials(entry.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <p className="font-semibold">
                    {entry.full_name}
                    {entry.user_id === userId && (
                      <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">You</span>
                    )}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {entry.total_sessions} sessions
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {entry.current_streak} day streak
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {Math.floor(entry.total_minutes / 60)}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.total_minutes % 60}m studied
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
