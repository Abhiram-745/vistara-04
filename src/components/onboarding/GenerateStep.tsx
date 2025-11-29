import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Subject, Topic, TestDate, StudyPreferences } from "../OnboardingWizard";
import { Homework } from "./HomeworkStep";
import { checkCanCreateTimetable, incrementUsage } from "@/hooks/useUserRole";
import PaywallDialog from "@/components/PaywallDialog";
import FeasibilityCheck from "./FeasibilityCheck";
import { calculateFeasibility, FeasibilityResult } from "@/utils/feasibilityCalculator";
import { useQueryClient } from "@tanstack/react-query";
import GenerationProgress from "./GenerationProgress";
import { triggerConfetti } from "@/utils/celebrations";

interface GenerateStepProps {
  subjects: Subject[];
  topics: Topic[];
  testDates: TestDate[];
  preferences: StudyPreferences;
  homeworks: Homework[];
  topicAnalysis?: any;
  timetableMode: string | null;
  timetableName?: string;
  startDate?: string;
  endDate?: string;
  onComplete: () => void;
}

const GenerateStep = ({
  subjects,
  topics,
  testDates,
  preferences,
  homeworks,
  topicAnalysis,
  timetableMode,
  timetableName: initialName,
  startDate: initialStartDate,
  endDate: initialEndDate,
  onComplete,
}: GenerateStepProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [generationStage, setGenerationStage] = useState<string>("");
  
  // Default dates: start tomorrow, end in 1 week
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const oneWeekLater = new Date(tomorrow);
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);
  
  const [timetableName, setTimetableName] = useState(initialName || "My Study Timetable");
  const [startDate, setStartDate] = useState(initialStartDate || tomorrow.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialEndDate || oneWeekLater.toISOString().split('T')[0]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  // Fetch events when dates change
  useEffect(() => {
    const fetchEvents = async () => {
      if (!startDate || !endDate) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: eventsData, error } = await supabase
          .from("events")
          .select("*")
          .eq("user_id", user.id)
          .gte("start_time", `${startDate}T00:00:00`)
          .lte("start_time", `${endDate}T23:59:59`)
          .order("start_time", { ascending: true });

        if (error) throw error;

        const uniqueEvents = Array.from(
          new Map(
            (eventsData || []).map((evt) => [
              `${evt.title}-${evt.start_time}-${evt.end_time}-${evt.id}`,
              evt,
            ])
          ).values()
        );

        setEvents(uniqueEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, [startDate, endDate]);

  // Calculate feasibility when inputs change
  useEffect(() => {
    if (!startDate || !endDate || !subjects.length || !topics.length) {
      setFeasibility(null);
      return;
    }

    const result = calculateFeasibility(
      subjects,
      topics,
      testDates,
      preferences,
      homeworks,
      startDate,
      endDate,
      events
    );

    setFeasibility(result);
  }, [subjects, topics, testDates, preferences, homeworks, startDate, endDate, events]);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    // Validate that end date is after start date
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      toast.error("End date must be after start date");
      return;
    }

    // Check if user can create timetable
    const canCreate = await checkCanCreateTimetable();
    if (!canCreate) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    setGenerationStage("saving");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch user events
      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", `${startDate}T00:00:00`)
        .lte("start_time", `${endDate}T23:59:59`)
        .order("start_time", { ascending: true });

      if (eventsError) throw eventsError;

      const uniqueEvents = Array.from(
        new Map(
          (events || []).map((evt) => [
            `${evt.title}-${evt.start_time}-${evt.end_time}-${evt.id}`,
            evt,
          ])
        ).values()
      );

      // Save homeworks to database (use upsert to avoid duplicates)
      if (homeworks.length > 0) {
        const { error: homeworkError } = await supabase
          .from("homeworks")
          .upsert(
            homeworks.map((hw) => ({
              user_id: user.id,
              subject: hw.subject,
              title: hw.title,
              description: hw.description,
              due_date: hw.due_date,
              duration: hw.duration,
              completed: false,
            })),
            {
              onConflict: "user_id,title,subject,due_date",
              ignoreDuplicates: true,
            }
          );

        if (homeworkError) throw homeworkError;
      }

      // Save subjects
      const { data: savedSubjects, error: subjectsError } = await supabase
        .from("subjects")
        .insert(
          subjects.map((s) => ({
            user_id: user.id,
            name: s.name,
            exam_board: s.exam_board,
          }))
        )
        .select();

      if (subjectsError) throw subjectsError;

      // Map both client-side UUIDs and indices to new database IDs
      const subjectIdMap: { [key: string]: string } = {};
      savedSubjects.forEach((saved, index) => {
        // Map by index (backward compatibility)
        subjectIdMap[index.toString()] = saved.id;
        // Map by client-side UUID if the original subject had one
        if (subjects[index]?.id) {
          subjectIdMap[subjects[index].id] = saved.id;
        }
      });

      // Save topics with correct subject IDs - filter out any with invalid subject_id
      const topicsToInsert = topics.map((t) => ({
        subject_id: subjectIdMap[t.subject_id],
        name: t.name,
      })).filter(t => t.subject_id);

      if (topicsToInsert.length !== topics.length) {
        console.warn(`Some topics had invalid subject_ids. Expected ${topics.length}, got ${topicsToInsert.length}`);
      }

      if (topicsToInsert.length > 0) {
        const { error: topicsError } = await supabase
          .from("topics")
          .insert(topicsToInsert);

        if (topicsError) throw topicsError;
      }

      // Save test dates with correct subject IDs - filter out any with invalid subject_id
      const testDatesToInsert = testDates.map((td) => ({
        subject_id: subjectIdMap[td.subject_id],
        test_date: td.test_date,
        test_type: td.test_type,
      })).filter(td => td.subject_id);

      if (testDatesToInsert.length !== testDates.length) {
        console.warn(`Some test dates had invalid subject_ids. Expected ${testDates.length}, got ${testDatesToInsert.length}`);
      }

      if (testDatesToInsert.length > 0) {
        const { error: datesError } = await supabase
          .from("test_dates")
          .insert(testDatesToInsert);

        if (datesError) throw datesError;
      }

      // Save preferences
      const { error: prefsError } = await supabase
        .from("study_preferences")
        .upsert([{
          user_id: user.id,
          daily_study_hours: preferences.daily_study_hours,
          session_duration: preferences.session_duration,
          break_duration: preferences.break_duration,
          day_time_slots: preferences.day_time_slots as any,
          study_before_school: preferences.study_before_school || false,
          study_during_lunch: preferences.study_during_lunch || false,
          study_during_free_periods: preferences.study_during_free_periods || false,
          before_school_start: preferences.before_school_start || null,
          before_school_end: preferences.before_school_end || null,
          lunch_start: preferences.lunch_start || null,
          lunch_end: preferences.lunch_end || null,
        }], { onConflict: 'user_id' });

      if (prefsError) throw prefsError;

      // Update stage to analyzing
      setGenerationStage("analyzing");
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX

      // Update stage to scheduling
      setGenerationStage("scheduling");

      // Generate timetable using AI
      const { data: timetableData, error: generateError } = await supabase.functions.invoke(
        "generate-timetable",
        {
          body: {
            subjects: savedSubjects.map((saved, index) => ({
              ...saved,
              mode: subjects[index].mode
            })),
            topics: topics.map((t) => ({
              ...t,
              subject_id: subjectIdMap[t.subject_id],
            })),
            testDates: testDates.map((td) => ({
              ...td,
              subject_id: subjectIdMap[td.subject_id],
            })),
            preferences,
            homeworks: homeworks.map(({ id, ...hw }) => hw) || [],
            topicAnalysis,
            aiNotes: preferences.aiNotes || "",
            events: uniqueEvents,
            startDate,
            endDate,
            timetableMode,
          },
        }
      );

      if (generateError) throw generateError;

      // Update stage to optimizing
      setGenerationStage("optimizing");
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause for UX

      // Update stage to finalizing
      setGenerationStage("finalizing");

      // Save generated timetable
      const { error: saveError } = await supabase
        .from("timetables")
        .insert({
          user_id: user.id,
          name: timetableName,
          start_date: startDate,
          end_date: endDate,
          schedule: timetableData.schedule,
          subjects: savedSubjects as any,
          topics: topics.map((t) => ({
            ...t,
            subject_id: subjectIdMap[t.subject_id],
          })) as any,
          test_dates: testDates.map((td) => ({
            ...td,
            subject_id: subjectIdMap[td.subject_id],
          })) as any,
          preferences: preferences as any,
        });

      if (saveError) throw saveError;

      // Increment usage counter and invalidate cache
      await incrementUsage("timetable_creation", queryClient);

      // Trigger celebration!
      triggerConfetti('complete');
      toast.success("Timetable generated successfully!");
      
      // Check if this is the user's first timetable and trigger the features tour
      const { data: allTimetables } = await supabase
        .from("timetables")
        .select("id")
        .eq("user_id", user.id);
      
      if (allTimetables && allTimetables.length === 1) {
        // This is the first timetable - only advance if user is actively in onboarding
        const onboardingStage = localStorage.getItem(`onboarding_stage_${user.id}`);
        const completedFlag = localStorage.getItem(`onboarding_completed_${user.id}`);
        
        // Only trigger features tour if user is in onboarding flow (not completed)
        if (onboardingStage === "timetable-create" && completedFlag !== "true") {
          localStorage.setItem(`onboarding_stage_${user.id}`, "timetable-features");
        }
      }
      
      onComplete();
    } catch (error: any) {
      console.error("Error generating timetable:", error);
      toast.error(error.message || "Failed to generate timetable");
    } finally {
      setLoading(false);
      setGenerationStage("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-lg space-y-2">
        <h3 className="font-semibold">Summary</h3>
        <ul className="text-sm space-y-1">
          <li>• {subjects.length} subjects</li>
          <li>• {topics.length} topics to cover</li>
          <li>• {testDates.length} upcoming tests</li>
          <li>• {homeworks.length} homework assignments</li>
          <li>• {preferences.daily_study_hours} hours study per day</li>
          <li>• {preferences.day_time_slots.filter(s => s.enabled).length} study days per week</li>
        </ul>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="timetable-name">Timetable Name</Label>
          <Input
            id="timetable-name"
            value={timetableName}
            onChange={(e) => setTimetableName(e.target.value)}
            placeholder="e.g., Spring Term Revision"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                // If end date is before new start date, adjust it
                if (endDate && new Date(endDate) <= new Date(e.target.value)) {
                  const newEnd = new Date(e.target.value);
                  newEnd.setDate(newEnd.getDate() + 7);
                  setEndDate(newEnd.toISOString().split('T')[0]);
                }
              }}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate ? (() => {
                const minEnd = new Date(startDate);
                minEnd.setDate(minEnd.getDate() + 1);
                return minEnd.toISOString().split('T')[0];
              })() : undefined}
            />
          </div>
        </div>
      </div>

      {/* Feasibility Check - shows after dates are selected */}
      {feasibility && !loading && (
        <div className="animate-fade-in">
          <FeasibilityCheck result={feasibility} />
        </div>
      )}

      {/* Generation Progress - shows during generation */}
      {loading && generationStage && (
        <div className="animate-fade-in">
          <GenerationProgress currentStage={generationStage} />
        </div>
      )}

      {!loading && (
        <Button
          onClick={handleGenerate}
          disabled={loading || !startDate || !endDate}
          className="w-full bg-gradient-primary hover:opacity-90 gap-2"
          size="lg"
        >
          <Sparkles className="h-5 w-5" />
          Generate AI-Powered Timetable
        </Button>
      )}

      <PaywallDialog
        open={showPaywall}
        onOpenChange={setShowPaywall}
        limitType="timetable_creation"
      />
    </div>
  );
};

export default GenerateStep;
