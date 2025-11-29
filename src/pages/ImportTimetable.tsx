import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PreferencesStep from "@/components/onboarding/PreferencesStep";
import DifficultTopicsStep from "@/components/onboarding/DifficultTopicsStep";
import TestDatesStep from "@/components/onboarding/TestDatesStep";
import HomeworkStep, { Homework } from "@/components/onboarding/HomeworkStep";
import { EventsWidget } from "@/components/EventsWidget";

interface TestDate {
  subject_id: string;
  test_date: string;
  test_type: string;
}

const ImportTimetable = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sharedTimetable, shareId, sharedBy } = location.state || {};

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  
  // State for imported data
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any>({});
  const [testDates, setTestDates] = useState<TestDate[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // State for customization
  const [preferences, setPreferences] = useState<any>({
    daily_study_hours: 2,
    session_duration: 45,
    break_duration: 15,
    day_time_slots: [
      { day: "monday", enabled: true, startTime: "09:00", endTime: "17:00" },
      { day: "tuesday", enabled: true, startTime: "09:00", endTime: "17:00" },
      { day: "wednesday", enabled: true, startTime: "09:00", endTime: "17:00" },
      { day: "thursday", enabled: true, startTime: "09:00", endTime: "17:00" },
      { day: "friday", enabled: true, startTime: "09:00", endTime: "17:00" },
      { day: "saturday", enabled: true, startTime: "09:00", endTime: "17:00" },
      { day: "sunday", enabled: true, startTime: "09:00", endTime: "17:00" }
    ]
  });
  const [topicConfidences, setTopicConfidences] = useState<any>({});
  const [events, setEvents] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [parsedTopics, setParsedTopics] = useState<any[]>([]);

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (!sharedTimetable) {
      navigate('/groups');
      return;
    }
    
    initializeData();
    loadUserData();
  }, []);

  const initializeData = () => {
    // Extract subjects and topics from shared timetable
    const subjectsArray = Array.isArray(sharedTimetable.subjects)
      ? sharedTimetable.subjects
      : Object.values(sharedTimetable.subjects || {});
    
    setSubjects(subjectsArray);
    
    // Handle topics - they come as an array from the database
    const topicsData = sharedTimetable.topics || [];
    setTopics(topicsData);
    
    // Parse topics for difficulty step
    // Topics from database are array of {name, subject_id} where subject_id is the UUID
    // DifficultTopicsStep expects subject_id to be the index in the subjects array
    let topicsArray: any[] = [];
    
    if (Array.isArray(topicsData) && topicsData.length > 0) {
      // Create a map of subject UUID to index
      const subjectIdToIndex = new Map();
      subjectsArray.forEach((subject: any, index: number) => {
        const subjectId = typeof subject === 'object' ? subject.id : subject;
        subjectIdToIndex.set(subjectId, index);
      });
      
      // Map topics to use subject index instead of UUID
      topicsArray = topicsData.map((topic: any) => ({
        name: topic.name,
        subject_id: subjectIdToIndex.get(topic.subject_id)?.toString() || "0"
      }));
    } else if (typeof topicsData === 'object' && !Array.isArray(topicsData)) {
      // Fallback for old format where topics might be object with subject indices
      topicsArray = Object.entries(topicsData).flatMap(([subjectIdx, topicList]: [string, any]) => {
        if (Array.isArray(topicList)) {
          return topicList.map((topicName: string) => ({
            name: topicName,
            subject_id: subjectIdx
          }));
        }
        return [];
      });
    }
    
    setParsedTopics(topicsArray);
    
    // Convert test dates - they come as an array from the database
    const testDatesData = sharedTimetable.test_dates || [];
    const testDatesArray = Array.isArray(testDatesData)
      ? testDatesData
      : Object.entries(testDatesData).flatMap(([subjectIdx, dates]: [string, any]) => {
          return (dates || []).map((date: any) => ({
            subject_id: subjectIdx,
            test_date: date.date || date.test_date,
            test_type: date.type || date.test_type || 'Exam'
          }));
        });
    setTestDates(testDatesArray);
    
    setStartDate(new Date(sharedTimetable.start_date));
    setEndDate(new Date(sharedTimetable.end_date));
  };

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserId(user.id);

      // Load user preferences
      const { data: prefsData } = await supabase
        .from('study_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsData) {
        setPreferences(prefsData);
      }

      // Load user events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('end_time', new Date().toISOString());

      if (eventsData) {
        setEvents(eventsData);
      }

      // Load user homework
      const { data: homeworkData } = await supabase
        .from('homeworks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('due_date', new Date().toISOString().split('T')[0]);

      if (homeworkData) {
        const formattedHomework = homeworkData.map(hw => ({
          id: hw.id,
          subject: hw.subject,
          title: hw.title,
          description: hw.description || '',
          due_date: hw.due_date,
          duration: hw.duration || 60
        }));
        setHomeworks(formattedHomework);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    if (!preferences) {
      toast.error('Please set your study preferences');
      return;
    }

    if (!userId) {
      toast.error('Unable to generate timetable: user not loaded');
      return;
    }

    setLoading(true);
    try {
      // Call generate-timetable edge function with imported data
      const { data: timetableData, error: generateError } = await supabase.functions.invoke('generate-timetable', {
        body: {
          subjects,
          topics,
          testDates,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          preferences: {
            ...preferences,
            duration_mode: preferences.duration_mode || 'flexible',
          },
          topicAnalysis: topicConfidences,
          events,
          homeworks,
        },
      });

      if (generateError) throw generateError;
      if (!timetableData || !timetableData.schedule) {
        throw new Error('Invalid timetable data returned');
      }

      const { data: savedTimetable, error: saveError } = await supabase
        .from('timetables')
        .insert({
          user_id: userId,
          name: sharedTimetable?.name || 'Imported Timetable',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          schedule: timetableData.schedule,
          subjects: subjects as any,
          topics: topics as any,
          test_dates: testDates as any,
          preferences: {
            ...preferences,
            duration_mode: preferences.duration_mode || 'flexible',
          } as any,
        })
        .select('id')
        .single();

      if (saveError) throw saveError;

      toast.success('Timetable created successfully!');
      navigate(`/timetable/${savedTimetable.id}`);
    } catch (error: any) {
      console.error('Error generating timetable:', error);
      toast.error(error.message || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };


  if (!sharedTimetable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <Card className="p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Customize Your Timetable
              </h1>
              <span className="text-sm text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <p className="text-muted-foreground mb-4">
              Implementing "{sharedTimetable.name}" from {sharedBy}
            </p>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-6">
            {currentStep === 1 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Your Events
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Add any existing events or commitments that should be considered when generating your timetable.
                </p>
                <EventsWidget />
                <div className="flex gap-2 mt-6">
                  <Button onClick={handleNext} className="flex-1 gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Your Homework
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Add any homework assignments with deadlines to include in your study schedule.
                </p>
                <HomeworkStep
                  subjects={subjects.map((s: any) => ({
                    id: typeof s === 'object' ? s.id : undefined,
                    name: typeof s === 'string' ? s : s.name,
                    exam_board: typeof s === 'object' ? s.exam_board : undefined,
                    mode: typeof s === 'object' && s.mode ? s.mode : "long-term-exam" as const
                  }))}
                  homeworks={homeworks}
                  setHomeworks={setHomeworks}
                />
                <div className="flex gap-2 mt-6">
                  <Button onClick={handleBack} variant="outline" className="flex-1 gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Your Study Preferences
                </h2>
                <PreferencesStep
                  preferences={preferences}
                  setPreferences={setPreferences}
                />
                <div className="flex gap-2 mt-6">
                  <Button onClick={handleBack} variant="outline" className="flex-1 gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Topic Confidence Levels
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select topics you want to focus on and rate your confidence (the AI will allocate more time to lower-confidence topics).
                </p>
                <DifficultTopicsStep
                  subjects={subjects.map((s: any) => ({
                    id: typeof s === 'object' ? s.id : undefined,
                    name: typeof s === 'string' ? s : s.name,
                    exam_board: typeof s === 'object' ? s.exam_board : undefined,
                    mode: typeof s === 'object' && s.mode ? s.mode : "long-term-exam" as const
                  }))}
                  topics={parsedTopics}
                  setTopics={setParsedTopics}
                  onAnalysisComplete={(analysis) => {
                    setTopicConfidences(analysis);
                  }}
                  onSkip={handleNext}
                />
                <div className="flex gap-2 mt-6">
                  <Button onClick={handleBack} variant="outline" className="flex-1 gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    className="flex-1 gap-2"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Review Test Dates
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Adjust or add test dates to help the AI prioritize your study schedule.
                </p>
                <TestDatesStep
                  subjects={subjects.map((s: any, idx: number) => ({
                    name: typeof s === 'string' ? s : s.name,
                    exam_board: typeof s === 'object' ? s.exam_board : undefined,
                    mode: typeof s === 'object' && s.mode ? s.mode : "long-term-exam" as const
                  }))}
                  testDates={testDates}
                  setTestDates={setTestDates}
                />
                <div className="flex gap-2 mt-6">
                  <Button onClick={handleBack} variant="outline" className="flex-1 gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Confirm & Generate
                </h2>
                <div className="space-y-4 mb-6">
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Your Personalized Timetable Summary
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          <strong>Subjects:</strong> {subjects.length} subjects
                        </p>
                        <p className="text-muted-foreground">
                          <strong>Study Period:</strong>{' '}
                          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground">
                          <strong>Daily Study Hours:</strong> {preferences?.daily_study_hours || 2} hours
                        </p>
                        <p className="text-muted-foreground">
                          <strong>Homework:</strong> {homeworks.length} assignments included
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          <strong>Session Mode:</strong> {preferences?.duration_mode === 'flexible' ? 'Flexible (AI-optimized)' : 'Fixed'} 
                        </p>
                        {preferences?.duration_mode === 'fixed' && (
                          <p className="text-muted-foreground">
                            <strong>Session/Break:</strong> {preferences?.session_duration}min / {preferences?.break_duration}min
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          <strong>Your Events:</strong> {events.length} events will be avoided
                        </p>
                        <p className="text-muted-foreground">
                          <strong>Focus Topics:</strong> {topicConfidences?.difficult_topics?.length || 0} selected
                        </p>
                        <p className="text-muted-foreground">
                          <strong>Test Dates:</strong> {testDates.length} exams scheduled
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex-1 gap-2 bg-gradient-primary"
                    size="lg"
                  >
                    {loading ? (
                      <>Generating Your Timetable...</>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Personalized Timetable
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ImportTimetable;
