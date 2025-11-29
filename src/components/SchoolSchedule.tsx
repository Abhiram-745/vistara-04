import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schoolScheduleSchema = z.object({
  schoolStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  schoolEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
}).refine((data) => {
  if (!data.schoolStartTime || !data.schoolEndTime) return true; // Allow empty
  const [startHour, startMin] = data.schoolStartTime.split(":").map(Number);
  const [endHour, endMin] = data.schoolEndTime.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
}, {
  message: "School end time must be after start time",
  path: ["schoolEndTime"],
});

export const SchoolSchedule = () => {
  const [schoolStartTime, setSchoolStartTime] = useState("");
  const [schoolEndTime, setSchoolEndTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchoolSchedule();
  }, []);

  const fetchSchoolSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("study_preferences")
        .select("school_start_time, school_end_time")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSchoolStartTime(data.school_start_time || "");
        setSchoolEndTime(data.school_end_time || "");
      }
    } catch (error) {
      console.error("Error fetching school schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate input
    const validation = schoolScheduleSchema.safeParse({
      schoolStartTime,
      schoolEndTime,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Get current study_before_school, study_during_lunch, study_during_free_periods values
      const { data: currentPrefs } = await supabase
        .from("study_preferences")
        .select("study_before_school, study_during_lunch, study_during_free_periods, before_school_start, before_school_end, lunch_start, lunch_end")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase
        .from("study_preferences")
        .update({
          school_start_time: schoolStartTime || null,
          school_end_time: schoolEndTime || null,
          // Preserve existing school-time study preferences
          study_before_school: currentPrefs?.study_before_school,
          study_during_lunch: currentPrefs?.study_during_lunch,
          study_during_free_periods: currentPrefs?.study_during_free_periods,
          before_school_start: currentPrefs?.before_school_start,
          before_school_end: currentPrefs?.before_school_end,
          lunch_start: currentPrefs?.lunch_start,
          lunch_end: currentPrefs?.lunch_end,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("School schedule saved successfully");
    } catch (error) {
      console.error("Error saving school schedule:", error);
      toast.error("Failed to save school schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("study_preferences")
        .update({
          school_start_time: null,
          school_end_time: null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setSchoolStartTime("");
      setSchoolEndTime("");
      toast.success("School schedule cleared");
    } catch (error) {
      console.error("Error clearing school schedule:", error);
      toast.error("Failed to clear school schedule");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="school-schedule">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          School Schedule
        </CardTitle>
        <CardDescription>
          Set your daily school hours so they're automatically blocked in your study timetables
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="school-start">Leave for School</Label>
            <Input
              id="school-start"
              type="time"
              value={schoolStartTime}
              onChange={(e) => setSchoolStartTime(e.target.value)}
              placeholder="e.g., 08:00"
            />
            <p className="text-xs text-muted-foreground">
              What time do you typically leave for school?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="school-end">Return from School</Label>
            <Input
              id="school-end"
              type="time"
              value={schoolEndTime}
              onChange={(e) => setSchoolEndTime(e.target.value)}
              placeholder="e.g., 15:30"
            />
            <p className="text-xs text-muted-foreground">
              What time do you usually get back home?
            </p>
          </div>
        </div>

        {schoolStartTime && schoolEndTime && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Daily school hours:</span>{" "}
              {schoolStartTime} - {schoolEndTime}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This time will be automatically blocked in all your study timetables
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Schedule"}
          </Button>
          {(schoolStartTime || schoolEndTime) && (
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={saving}
            >
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
