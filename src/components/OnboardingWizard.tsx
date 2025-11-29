import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import TimetableModeStep, { TimetableMode } from "./onboarding/TimetableModeStep";
import SubjectsStep from "./onboarding/SubjectsStep";
import TopicsStep from "./onboarding/TopicsStep";
import DifficultTopicsStep from "./onboarding/DifficultTopicsStep";
import TestDatesStep from "./onboarding/TestDatesStep";
import PreferencesStep from "./onboarding/PreferencesStep";
import HomeworkStep, { Homework } from "./onboarding/HomeworkStep";
import TimetableDatesStep from "./onboarding/TimetableDatesStep";
import GenerateStep from "./onboarding/GenerateStep";
import WizardTour from "./tours/WizardTour";

const WIZARD_STORAGE_KEY = "timetable-wizard-progress";

interface OnboardingWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

export interface Subject {
  id?: string;
  name: string;
  exam_board: string;
  mode: "short-term-exam" | "long-term-exam" | "no-exam";
}

export interface Topic {
  id?: string;
  subject_id: string;
  name: string;
  confidence?: number;
  difficulties?: string;
}

export interface TestDate {
  id?: string;
  subject_id: string;
  test_date: string;
  test_type: string;
}

export interface DayTimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface StudyPreferences {
  daily_study_hours: number;
  day_time_slots: DayTimeSlot[];
  break_duration: number;
  session_duration: number;
  duration_mode: "fixed" | "flexible";
  aiNotes?: string;
  study_before_school?: boolean;
  study_during_lunch?: boolean;
  study_during_free_periods?: boolean;
  before_school_start?: string;
  before_school_end?: string;
  lunch_start?: string;
  lunch_end?: string;
  free_period_times?: string[];
}

const defaultPreferences: StudyPreferences = {
  daily_study_hours: 2,
  day_time_slots: [
    { day: "monday", startTime: "09:00", endTime: "17:00", enabled: true },
    { day: "tuesday", startTime: "09:00", endTime: "17:00", enabled: true },
    { day: "wednesday", startTime: "09:00", endTime: "17:00", enabled: true },
    { day: "thursday", startTime: "09:00", endTime: "17:00", enabled: true },
    { day: "friday", startTime: "09:00", endTime: "17:00", enabled: true },
    { day: "saturday", startTime: "09:00", endTime: "17:00", enabled: true },
    { day: "sunday", startTime: "09:00", endTime: "17:00", enabled: true },
  ],
  break_duration: 15,
  session_duration: 45,
  duration_mode: "flexible",
};

const loadSavedProgress = () => {
  try {
    const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load wizard progress:", e);
  }
  return null;
};

const OnboardingWizard = ({ onComplete, onCancel }: OnboardingWizardProps) => {
  const savedProgress = loadSavedProgress();
  
  const [step, setStep] = useState(savedProgress?.step || 1);
  const [subjects, setSubjects] = useState<Subject[]>(savedProgress?.subjects || []);
  const [topics, setTopics] = useState<Topic[]>(savedProgress?.topics || []);
  const [topicAnalysis, setTopicAnalysis] = useState<any>(savedProgress?.topicAnalysis || null);
  const [testDates, setTestDates] = useState<TestDate[]>(savedProgress?.testDates || []);
  const [preferences, setPreferences] = useState<StudyPreferences>(savedProgress?.preferences || defaultPreferences);
  const [homeworks, setHomeworks] = useState<Homework[]>(savedProgress?.homeworks || []);
  const [timetableName, setTimetableName] = useState(savedProgress?.timetableName || "My Study Timetable");
  const [startDate, setStartDate] = useState(savedProgress?.startDate || "");
  const [endDate, setEndDate] = useState(savedProgress?.endDate || "");

  // Save progress to localStorage whenever state changes
  const saveProgress = useCallback(() => {
    const progress = {
      step,
      subjects,
      topics,
      topicAnalysis,
      testDates,
      preferences,
      homeworks,
      timetableName,
      startDate,
      endDate,
    };
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(progress));
  }, [step, subjects, topics, topicAnalysis, testDates, preferences, homeworks, timetableName, startDate, endDate]);

  useEffect(() => {
    saveProgress();
  }, [saveProgress]);

  // Clear progress when timetable is created
  const handleComplete = () => {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
    onComplete();
  };

  const totalSteps = 8;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      // Skip test dates step if all subjects are no-exam mode
      if (step === 3 && subjects.every(s => s.mode === "no-exam")) {
        setStep(step + 2); // Skip step 4 (test dates)
      } else {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step === 1 && onCancel) {
      onCancel();
    } else if (step > 1) {
      // Skip test dates step if all subjects are no-exam mode when going back
      if (step === 5 && subjects.every(s => s.mode === "no-exam")) {
        setStep(step - 2); // Skip step 4 (test dates)
      } else {
        setStep(step - 1);
      }
    }
  };

  const stepTitles = [
    "Your GCSE Subjects",
    "Topics You're Studying",
    "Topics You Find Difficult",
    "Upcoming Test Dates",
    "Study Preferences",
    "Homework Assignments",
    "Timetable Period",
    "Generate Timetable",
  ];

  // Get timetableMode based on subjects - prioritize most urgent
  const timetableMode = subjects.some(s => s.mode === "short-term-exam") 
    ? "short-term-exam" 
    : subjects.some(s => s.mode === "long-term-exam")
    ? "long-term-exam"
    : "no-exam";

  return (
    <>
      <WizardTour currentStep={step} />
      <Card className="w-full max-w-3xl mx-auto shadow-lg flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[85vh]">
        <CardHeader className="flex-shrink-0 pb-2 sm:pb-4 px-4 sm:px-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <CardTitle className="text-lg sm:text-xl md:text-2xl">{stepTitles[step - 1]}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {step === 1 && "Add the subjects you're taking and select the study mode for each"}
            {step === 2 && "Tell us which topics you're currently studying"}
            {step === 3 && "Select topics you find difficult and tell us why"}
            {step === 4 && "When are your tests scheduled?"}
            {step === 5 && "Set your study preferences"}
            {step === 6 && "Add any homework assignments to include in your timetable"}
            {step === 7 && "Choose when your timetable should start and end"}
            {step === 8 && "Review and generate your personalized timetable"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 px-4 sm:px-6">
          <div className="flex-1 overflow-y-auto min-h-0 pr-2" style={{ maxHeight: 'calc(100vh - 18rem)' }}>
            <div className="space-y-4 pb-4">
              {step === 1 && (
                <div data-tour="subjects-step">
                  <SubjectsStep subjects={subjects} setSubjects={setSubjects} />
                </div>
              )}
              {step === 2 && (
                <div data-tour="topics-step">
                  <TopicsStep subjects={subjects} topics={topics} setTopics={setTopics} />
                </div>
              )}
              {step === 3 && (
                <div data-tour="difficult-topics-step">
                  <DifficultTopicsStep 
                    subjects={subjects} 
                    topics={topics}
                    setTopics={setTopics}
                    onAnalysisComplete={setTopicAnalysis}
                    onSkip={handleNext}
                  />
                </div>
              )}
              {step === 4 && !subjects.every(s => s.mode === "no-exam") && (
                <div data-tour="test-dates-step">
                  <TestDatesStep subjects={subjects} testDates={testDates} setTestDates={setTestDates} />
                </div>
              )}
              {step === 5 && (
                <div data-tour="preferences-step">
                  <PreferencesStep preferences={preferences} setPreferences={setPreferences} />
                </div>
              )}
              {step === 6 && (
                <div data-tour="homework-step">
                  <HomeworkStep subjects={subjects} homeworks={homeworks} setHomeworks={setHomeworks} />
                </div>
              )}
              {step === 7 && (
                <div data-tour="dates-step">
                  <TimetableDatesStep
                    timetableName={timetableName}
                    setTimetableName={setTimetableName}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                  />
                </div>
              )}
              {step === 8 && (
                <div data-tour="generate-step">
                  <GenerateStep
                    subjects={subjects}
                    topics={topics}
                    testDates={testDates}
                    preferences={preferences}
                    homeworks={homeworks}
                    topicAnalysis={topicAnalysis}
                    timetableMode={timetableMode}
                    timetableName={timetableName}
                    startDate={startDate}
                    endDate={endDate}
                    onComplete={handleComplete}
                  />
                </div>
              )}
            </div>
          </div>

          {step !== 3 && (
            <div className="flex justify-between pt-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleBack}
              >
                Back
              </Button>
              {step < totalSteps && (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-primary hover:opacity-90"
                  disabled={
                    (step === 1 && subjects.length === 0) ||
                    (step === 2 && topics.length === 0) ||
                    (step === 4 && !subjects.every(s => s.mode === "no-exam") && testDates.length === 0) ||
                    (step === 7 && (!startDate || !endDate || !timetableName.trim()))
                  }
                >
                  Next
                </Button>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex justify-start pt-4 border-t flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleBack}
              >
                Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default OnboardingWizard;
