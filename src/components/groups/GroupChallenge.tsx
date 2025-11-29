import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Edit2, Save, X, Trophy, Calendar, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface GroupChallengeProps {
  groupId: string;
  isAdmin: boolean;
}

interface ChallengeData {
  daily_hours_goal: number;
  weekly_hours_goal: number;
  monthly_hours_goal: number;
}

export const GroupChallenge = ({ groupId, isAdmin }: GroupChallengeProps) => {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [editing, setEditing] = useState(false);
  const [dailyGoal, setDailyGoal] = useState<number>(2);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(14);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(60);
  const [todayHours, setTodayHours] = useState<number>(0);
  const [weekHours, setWeekHours] = useState<number>(0);
  const [monthHours, setMonthHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenge();
    loadProgress();
  }, [groupId]);

  const loadChallenge = async () => {
    try {
      const { data, error } = await supabase
        .from("group_challenges")
        .select("*")
        .eq("group_id", groupId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setChallenge(data);
        setDailyGoal(data.daily_hours_goal);
        setWeeklyGoal(data.weekly_hours_goal || 14);
        setMonthlyGoal(data.monthly_hours_goal || 60);
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString().split("T")[0];
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString().split("T")[0];
      const monthStart = startOfMonth(today).toISOString().split("T")[0];
      const monthEnd = endOfMonth(today).toISOString().split("T")[0];

      // Get all group members
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      if (!members || members.length === 0) return;

      const memberIds = members.map(m => m.user_id);

      // Get today's hours
      const { data: todayStreaks } = await supabase
        .from("study_streaks")
        .select("minutes_studied")
        .in("user_id", memberIds)
        .eq("date", todayStr);

      const todayMinutes = todayStreaks?.reduce((sum, s) => sum + s.minutes_studied, 0) || 0;
      setTodayHours(todayMinutes / 60);

      // Get week's hours
      const { data: weekStreaks } = await supabase
        .from("study_streaks")
        .select("minutes_studied")
        .in("user_id", memberIds)
        .gte("date", weekStart)
        .lte("date", weekEnd);

      const weekMinutes = weekStreaks?.reduce((sum, s) => sum + s.minutes_studied, 0) || 0;
      setWeekHours(weekMinutes / 60);

      // Get month's hours
      const { data: monthStreaks } = await supabase
        .from("study_streaks")
        .select("minutes_studied")
        .in("user_id", memberIds)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const monthMinutes = monthStreaks?.reduce((sum, s) => sum + s.minutes_studied, 0) || 0;
      setMonthHours(monthMinutes / 60);
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const handleSaveGoals = async () => {
    try {
      if (dailyGoal < 1 || dailyGoal > 24) {
        toast.error("Daily goal must be between 1 and 24 hours");
        return;
      }
      if (weeklyGoal < 1 || weeklyGoal > 168) {
        toast.error("Weekly goal must be between 1 and 168 hours");
        return;
      }
      if (monthlyGoal < 1 || monthlyGoal > 744) {
        toast.error("Monthly goal must be between 1 and 744 hours");
        return;
      }

      const { error } = await supabase
        .from("group_challenges")
        .upsert({
          group_id: groupId,
          daily_hours_goal: dailyGoal,
          weekly_hours_goal: weeklyGoal,
          monthly_hours_goal: monthlyGoal,
        });

      if (error) throw error;

      toast.success("Challenge goals updated!");
      setEditing(false);
      loadChallenge();
    } catch (error) {
      console.error("Error saving goals:", error);
      toast.error("Failed to update goals");
    }
  };

  if (loading) {
    return null;
  }

  const dailyProgress = (todayHours / dailyGoal) * 100;
  const weeklyProgress = (weekHours / weeklyGoal) * 100;
  const monthlyProgress = (monthHours / monthlyGoal) * 100;
  const dailyAchieved = todayHours >= dailyGoal;
  const weeklyAchieved = weekHours >= weeklyGoal;
  const monthlyAchieved = monthHours >= monthlyGoal;

  const renderChallengeTab = (
    type: string,
    hours: number,
    goal: number,
    progress: number,
    achieved: boolean,
    icon: React.ReactNode
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className="font-semibold">{type} Challenge</p>
            <p className="text-sm text-muted-foreground">
              {achieved ? "🎉 Goal achieved!" : `Study ${goal} hours as a group`}
            </p>
          </div>
        </div>
        {achieved && <Trophy className="h-6 w-6 text-green-500 animate-bounce" />}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold">
            {hours.toFixed(1)}h / {goal}h
          </span>
        </div>
        <Progress value={Math.min(progress, 100)} className="h-3" />
      </div>
    </div>
  );

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Group Challenges
            </CardTitle>
            <CardDescription>Track your group's study goals</CardDescription>
          </div>
          {isAdmin && !editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily">Daily Hours Goal</Label>
              <Input
                id="daily"
                type="number"
                min="1"
                max="24"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(parseInt(e.target.value) || 2)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly">Weekly Hours Goal</Label>
              <Input
                id="weekly"
                type="number"
                min="1"
                max="168"
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(parseInt(e.target.value) || 14)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly">Monthly Hours Goal</Label>
              <Input
                id="monthly"
                type="number"
                min="1"
                max="744"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(parseInt(e.target.value) || 60)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveGoals} className="flex-1">
                <Save className="h-4 w-4 mr-1" />
                Save All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setDailyGoal(challenge?.daily_hours_goal || 2);
                  setWeeklyGoal(challenge?.weekly_hours_goal || 14);
                  setMonthlyGoal(challenge?.monthly_hours_goal || 60);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              {renderChallengeTab(
                "Daily",
                todayHours,
                dailyGoal,
                dailyProgress,
                dailyAchieved,
                <Target className="h-5 w-5 text-primary" />
              )}
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              {renderChallengeTab(
                "Weekly",
                weekHours,
                weeklyGoal,
                weeklyProgress,
                weeklyAchieved,
                <Calendar className="h-5 w-5 text-primary" />
              )}
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
              {renderChallengeTab(
                "Monthly",
                monthHours,
                monthlyGoal,
                monthlyProgress,
                monthlyAchieved,
                <CalendarDays className="h-5 w-5 text-primary" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
