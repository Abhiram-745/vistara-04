import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Award, Target } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

interface StudyStreakTrackerProps {
  userId: string;
}

export const StudyStreakTracker = ({ userId }: StudyStreakTrackerProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreakData();
  }, [userId]);

  const fetchStreakData = async () => {
    // Fetch all study streak records for the user
    const { data, error } = await supabase
      .from("study_streaks")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching streaks:", error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setLoading(false);
      return;
    }

    // Calculate current streak
    let streak = 0;
    const today = startOfDay(new Date());
    const yesterday = startOfDay(subDays(new Date(), 1));

    // Check if studied today or yesterday (to maintain streak)
    const recentDates = data.map(d => startOfDay(new Date(d.date)).getTime());
    const todayTime = today.getTime();
    const yesterdayTime = yesterday.getTime();

    if (recentDates.includes(todayTime) || recentDates.includes(yesterdayTime)) {
      // Start counting from most recent
      let currentDate = recentDates.includes(todayTime) ? today : yesterday;
      
      for (const record of data) {
        const recordDate = startOfDay(new Date(record.date)).getTime();
        if (recordDate === currentDate.getTime()) {
          streak++;
          currentDate = startOfDay(subDays(currentDate, 1));
        } else if (recordDate < currentDate.getTime()) {
          break;
        }
      }
    }

    // Calculate longest streak
    let maxStreak = 0;
    let tempStreak = 1;
    
    for (let i = 0; i < data.length - 1; i++) {
      const current = startOfDay(new Date(data[i].date));
      const next = startOfDay(new Date(data[i + 1].date));
      const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    setCurrentStreak(streak);
    setLongestStreak(maxStreak);
    setTotalDays(data.length);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading streak...</p>
        </CardContent>
      </Card>
    );
  }

  const getBadge = () => {
    if (currentStreak >= 30) return { icon: "🏆", text: "Study Champion!" };
    if (currentStreak >= 14) return { icon: "🌟", text: "On Fire!" };
    if (currentStreak >= 7) return { icon: "⭐", text: "Week Warrior!" };
    if (currentStreak >= 3) return { icon: "🔥", text: "Keep Going!" };
    return { icon: "💪", text: "Start Today!" };
  };

  const badge = getBadge();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Study Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Streak */}
          <div className="text-center space-y-2">
            <div className="text-5xl font-bold text-primary">{currentStreak}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
            <div className="flex items-center justify-center gap-2 text-lg">
              <span>{badge.icon}</span>
              <span className="font-medium">{badge.text}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Longest</span>
              </div>
              <div className="text-2xl font-bold">{longestStreak}</div>
              <div className="text-xs text-muted-foreground">days</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total</span>
              </div>
              <div className="text-2xl font-bold">{totalDays}</div>
              <div className="text-xs text-muted-foreground">days</div>
            </div>
          </div>

          {currentStreak === 0 && (
            <p className="text-sm text-center text-muted-foreground">
              Complete a study session today to start your streak! 🎯
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
