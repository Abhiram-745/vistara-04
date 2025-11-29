import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { triggerConfetti, triggerEmoji } from "@/utils/celebrations";

interface WeeklyGoalsWidgetProps {
  userId: string;
}

export const WeeklyGoalsWidget = ({ userId }: WeeklyGoalsWidgetProps) => {
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [targetHours, setTargetHours] = useState("");
  const [currentHours, setCurrentHours] = useState(0);
  const hasTriggeredCelebration = useRef(false);

  useEffect(() => {
    fetchWeeklyGoal();
    
    // Set up realtime subscription for study sessions
    const channel = supabase
      .channel('study-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refetch when sessions change
          fetchWeeklyGoal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchWeeklyGoal = async () => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    
    // Fetch weekly goal
    const { data: goalData, error: goalError } = await supabase
      .from("weekly_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (goalError) {
      console.error("Error fetching goal:", goalError);
    }

    // Fetch completed study sessions for this week and calculate total hours
    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("actual_duration_minutes, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("planned_start", `${weekStart}T00:00:00`)
      .lte("planned_start", `${weekEnd}T23:59:59`);

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
    }

    // Calculate total hours from completed sessions
    const totalMinutes = sessions?.reduce((sum, session) => 
      sum + (session.actual_duration_minutes || 0), 0) || 0;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal

    setCurrentHours(totalHours);
    setGoal(goalData);
    
    // Update the database with current hours if goal exists
    if (goalData) {
      await supabase
        .from("weekly_goals")
        .update({ current_hours: totalHours })
        .eq("id", goalData.id);
    }
    
    setLoading(false);
  };

  const createOrUpdateGoal = async () => {
    const hours = parseInt(targetHours);
    if (isNaN(hours) || hours < 1 || hours > 100) {
      toast.error("Please enter a valid number of hours (1-100)");
      return;
    }

    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    if (goal) {
      // Update existing goal
      const { error } = await supabase
        .from("weekly_goals")
        .update({ target_hours: hours })
        .eq("id", goal.id);

      if (error) {
        toast.error("Failed to update goal");
      } else {
        toast.success("Goal updated!");
        setIsEditing(false);
        fetchWeeklyGoal();
      }
    } else {
      // Create new goal
      const { error } = await supabase
        .from("weekly_goals")
        .insert({
          user_id: userId,
          week_start: weekStart,
          target_hours: hours,
          current_hours: 0,
        });

      if (error) {
        toast.error("Failed to create goal");
      } else {
        toast.success("Goal set!");
        setIsEditing(false);
        fetchWeeklyGoal();
      }
    }
    setTargetHours("");
  };

  const progressPercentage = goal
    ? Math.min((currentHours / goal.target_hours) * 100, 100)
    : 0;

  // Trigger celebration when goal is achieved
  useEffect(() => {
    if (progressPercentage >= 100 && goal && !hasTriggeredCelebration.current) {
      hasTriggeredCelebration.current = true;
      triggerConfetti('milestone');
      triggerEmoji('🎯');
      toast.success("Weekly goal achieved! Amazing work!");
    }
  }, [progressPercentage, goal]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading goals...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Weekly Goal
          </div>
          {goal && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsEditing(true);
                setTargetHours(goal.target_hours.toString());
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!goal && !isEditing ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Set a weekly study hour goal to track your progress!
            </p>
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Set Weekly Goal
            </Button>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Target Study Hours</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createOrUpdateGoal} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setTargetHours("");
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold">
                {currentHours}
                <span className="text-muted-foreground text-2xl"> / {goal.target_hours}h</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}% Complete
              </p>
            </div>

            {progressPercentage >= 100 ? (
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-lg font-semibold">🎉 Goal Achieved!</p>
                <p className="text-sm text-muted-foreground">Great work this week!</p>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                {Math.max(0, goal.target_hours - currentHours)} hours remaining this week
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
