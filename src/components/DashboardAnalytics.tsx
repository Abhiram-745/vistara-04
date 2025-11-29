import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Loader2, 
  BarChart3,
  Activity,
  CheckCircle2,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Timetable {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface Insight {
  strugglingTopics: Array<{
    topic: string;
    subject: string;
    severity: string;
    reason: string;
    quotes: string[];
  }>;
  strongAreas: Array<{
    topic: string;
    subject: string;
    reason: string;
    quotes: string[];
  }>;
  learningPatterns: string[];
  recommendedFocus: string[];
  personalizedTips: string[];
  subjectBreakdown: {
    [key: string]: {
      confidenceScore: number;
      summary: string;
      topicsCount: number;
    };
  };
  peakStudyHours?: {
    bestTimeWindow: string;
    bestTimeRange: string;
    worstTimeWindow: string;
    worstTimeRange: string;
    completionRateByWindow: {
      morning: number;
      afternoon: number;
      evening: number;
    };
    avgDifficultyByWindow: {
      morning: number;
      afternoon: number;
      evening: number;
    };
    recommendation: string;
  };
  overallSummary: string;
}

interface EfficiencyScore {
  score: number;
  rating: string;
  easyCount: number;
  hardCount: number;
  totalReflections: number;
}

export const DashboardAnalytics = ({ userId }: { userId: string }) => {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [reflections, setReflections] = useState<any[]>([]);
  const [efficiencyScore, setEfficiencyScore] = useState<EfficiencyScore | null>(null);
  const [allTopics, setAllTopics] = useState<Array<{ id: string; name: string; subject: string }>>([]);
  const [topicSubjectFilter, setTopicSubjectFilter] = useState<string>("all");

  useEffect(() => {
    fetchTimetables();
  }, [userId]);

  useEffect(() => {
    if (selectedTimetableId) {
      fetchReflections();
      fetchExistingInsights();
      calculateEfficiencyScore();
      fetchAllTopics();
    }
  }, [selectedTimetableId]);

  const fetchTimetables = async () => {
    const { data } = await supabase
      .from("timetables")
      .select("id, name, start_date, end_date")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setTimetables(data);
      setSelectedTimetableId(data[0].id);
    }
  };

  const fetchReflections = async () => {
    if (!selectedTimetableId) return;

    const { data } = await supabase
      .from("topic_reflections")
      .select("*")
      .eq("timetable_id", selectedTimetableId)
      .eq("user_id", userId);

    setReflections(data || []);
  };

  const fetchAllTopics = async () => {
    if (!selectedTimetableId) return;

    try {
      // Get the timetable to access topics
      const { data: timetableData } = await supabase
        .from("timetables")
        .select("topics, subjects")
        .eq("id", selectedTimetableId)
        .single();

      if (timetableData?.topics && timetableData?.subjects) {
        // Parse topics and subjects from JSON
        const topics = timetableData.topics as any;
        const subjects = timetableData.subjects as any;

        const topicList: Array<{ id: string; name: string; subject: string }> = [];

        // Create a subject map for quick lookup
        const subjectMap = new Map();
        if (Array.isArray(subjects)) {
          subjects.forEach((subject: any) => {
            subjectMap.set(subject.id, subject.name);
          });
        }

        // Topics are stored as a flat array with subject_id
        if (Array.isArray(topics)) {
          topics.forEach((topic: any, index: number) => {
            const subjectName = subjectMap.get(topic.subject_id) || 'Unknown Subject';
            topicList.push({
              id: `${topic.subject_id}-${index}`,
              name: topic.name,
              subject: subjectName,
            });
          });
        }

        setAllTopics(topicList);
      }
    } catch (error) {
      console.error("Error fetching all topics:", error);
    }
  };

  const fetchExistingInsights = async () => {
    if (!selectedTimetableId) return;

    const { data } = await supabase
      .from("study_insights")
      .select("*")
      .eq("timetable_id", selectedTimetableId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.insights_data) {
      setInsights(data.insights_data as unknown as Insight);
    }
  };

  const calculateEfficiencyScore = async () => {
    if (!selectedTimetableId) return;

    const { data } = await supabase
      .from("topic_reflections")
      .select("reflection_data")
      .eq("timetable_id", selectedTimetableId)
      .eq("user_id", userId);

    if (!data || data.length === 0) {
      setEfficiencyScore(null);
      return;
    }

    let easyCount = 0;
    let hardCount = 0;

    data.forEach((reflection) => {
      const reflectionData = reflection.reflection_data as any;
      if (reflectionData?.easyAspects) {
        easyCount += reflectionData.easyAspects.length;
      }
      if (reflectionData?.hardAspects) {
        hardCount += reflectionData.hardAspects.length;
      }
    });

    const total = easyCount + hardCount;
    const ratio = total > 0 ? (easyCount / total) * 100 : 0;
    
    let rating = "Starting Out";
    if (ratio >= 80) rating = "Excellent Retention";
    else if (ratio >= 65) rating = "Strong Understanding";
    else if (ratio >= 50) rating = "Good Progress";
    else if (ratio >= 35) rating = "Building Foundation";

    setEfficiencyScore({
      score: Math.round(ratio),
      rating,
      easyCount,
      hardCount,
      totalReflections: data.length,
    });
  };

  const generateInsights = async () => {
    if (!selectedTimetableId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { timetableId: selectedTimetableId }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setInsights(data.insights);
      toast.success("AI Analysis generated!");
    } catch (error) {
      console.error("Error generating insights:", error);
      toast.error("Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'secondary';
    }
  };

  if (timetables.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Create a timetable to see AI-powered study insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="section-header">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="section-title">✨ Study Analytics & AI Insights</h2>
          <p className="text-sm text-muted-foreground">Personalized feedback on your performance</p>
        </div>
      </div>

      {/* Timetable Selection Card */}
      <Card className="shadow-md">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex-1">
              <Select value={selectedTimetableId} onValueChange={setSelectedTimetableId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a timetable to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {timetables.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>
                      <span className="font-medium">{tt.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generateInsights}
              disabled={loading || reflections.length === 0}
              className="gap-2 w-full sm:w-auto shadow-md hover:-translate-y-0.5 transition-all"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>✨ Generate AI Analysis</span>
                </>
              )}
            </Button>
          </div>

          {reflections.length === 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Complete study sessions and add reflections to generate AI insights
            </p>
          )}
        </CardContent>
      </Card>

      {/* Study Efficiency Score */}
      {efficiencyScore && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Study Efficiency Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-primary">{efficiencyScore.score}%</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{efficiencyScore.rating}</p>
              </div>
              <div className="text-left sm:text-right space-y-1 w-full sm:w-auto">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  <span>{efficiencyScore.easyCount} easy aspects</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Target className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                  <span>{efficiencyScore.hardCount} hard aspects</span>
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  Based on {efficiencyScore.totalReflections} reflections
                </div>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2 sm:h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-500"
                style={{ width: `${efficiencyScore.score}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
              This score analyzes how well you're retaining information based on easy vs hard aspects in your reflections
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              AI Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Summary */}
            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm">{insights.overallSummary}</p>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs sm:text-sm">Performance</TabsTrigger>
                <TabsTrigger value="insights" className="text-xs sm:text-sm">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                {/* Topic Completion Matrix */}
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
                    <CardTitle className="text-sm sm:text-base">Topic Completion Status</CardTitle>
                    <Select value={topicSubjectFilter} onValueChange={setTopicSubjectFilter}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {Array.from(new Set(reflections.map(r => r.subject))).map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      if (reflections.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            <div className="text-center">
                              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">No study sessions completed yet</p>
                              <p className="text-xs mt-1">Complete study sessions and add reflections to see your progress</p>
                            </div>
                          </div>
                        );
                      }

                      // Group reflections by topic and subject
                      const topicReflectionMap = new Map<string, any[]>();
                      reflections.forEach((reflection) => {
                        const key = `${reflection.subject} - ${reflection.topic}`;
                        if (!topicReflectionMap.has(key)) {
                          topicReflectionMap.set(key, []);
                        }
                        topicReflectionMap.get(key)!.push(reflection);
                      });

                      // Filter by subject if selected
                      const filteredEntries = Array.from(topicReflectionMap.entries()).filter(([key]) => {
                        if (topicSubjectFilter === "all") return true;
                        return key.startsWith(topicSubjectFilter);
                      });

                      if (filteredEntries.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            <div className="text-center">
                              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">No reflections for this subject</p>
                            </div>
                          </div>
                        );
                      }

                      // Build completion data based on reflections
                      const topicCompletionData = filteredEntries.map(([topicKey, topicReflections]) => {
                        let totalEasy = 0;
                        let totalHard = 0;
                        
                        topicReflections.forEach((ref) => {
                          const data = ref.reflection_data as any;
                          
                          if (data?.easyAspects && Array.isArray(data.easyAspects)) {
                            totalEasy += data.easyAspects.length;
                          }
                          if (data?.hardAspects && Array.isArray(data.hardAspects)) {
                            totalHard += data.hardAspects.length;
                          }
                        });

                        // Calculate completion percentage
                        const total = totalEasy + totalHard;
                        const completionPercentage = total > 0 ? Math.round((totalEasy / total) * 100) : 0;
                        
                        // For visualization: show mastered vs still learning
                        const mastered = Math.round((totalEasy / Math.max(total, 1)) * 100);
                        const learning = 100 - mastered;

                        return {
                          topic: topicKey.length > 35 ? topicKey.substring(0, 35) + '...' : topicKey,
                          fullTopic: topicKey,
                          subject: topicKey.split(' - ')[0],
                          'Mastered': mastered,
                          'Still Learning': learning,
                          sessions: topicReflections.length,
                          completionPercentage,
                        };
                      });

                      // Sort by completion percentage (highest first)
                      const chartData = topicCompletionData.sort((a, b) => {
                        return b.completionPercentage - a.completionPercentage;
                      });

                      return (
                        <div className="space-y-4">
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            Showing {chartData.length} topic{chartData.length !== 1 ? 's' : ''} with completed study sessions
                          </div>
                          <div className="h-[400px] sm:h-[500px] w-full overflow-auto">
                            <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 40)}>
                              <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 10, right: 20, bottom: 10, left: window.innerWidth < 640 ? 100 : 160 }}
                              >
                                <XAxis 
                                  type="number" 
                                  domain={[0, 100]}
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: window.innerWidth < 640 ? 10 : 12 }}
                                  label={window.innerWidth >= 640 ? { value: 'Completion %', position: 'insideBottom', offset: -10, fill: 'hsl(var(--muted-foreground))' } : undefined}
                                />
                                <YAxis 
                                  dataKey="topic" 
                                  type="category" 
                                  width={window.innerWidth < 640 ? 90 : 150}
                                  tick={{ fill: 'hsl(var(--foreground))', fontSize: window.innerWidth < 640 ? 9 : 11 }}
                                />
                                <Tooltip 
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: window.innerWidth < 640 ? '11px' : '13px',
                                  }}
                                  labelFormatter={(label, payload) => {
                                    if (payload && payload[0]) {
                                      const data = payload[0].payload;
                                      return `${data.fullTopic}\n${data.sessions} session${data.sessions !== 1 ? 's' : ''} completed`;
                                    }
                                    return label;
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: window.innerWidth < 640 ? '11px' : '13px' }} />
                                <Bar 
                                  dataKey="Mastered" 
                                  stackId="a" 
                                  fill="hsl(var(--primary))" 
                                  radius={[0, 4, 4, 0]}
                                  name="Mastered %"
                                />
                                <Bar 
                                  dataKey="Still Learning" 
                                  stackId="a" 
                                  fill="hsl(var(--muted))" 
                                  radius={[0, 4, 4, 0]}
                                  name="Still Learning %"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Mistake Genome */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">Mistake Genome</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Build mistake patterns from hard aspects
                      const mistakeMap: { [key: string]: number } = {};
                      
                      reflections.forEach((ref) => {
                        const data = ref.reflection_data as any;
                        if (data?.hardAspects && Array.isArray(data.hardAspects)) {
                          data.hardAspects.forEach((aspect: any) => {
                            // Ensure aspect is a string before processing
                            if (typeof aspect !== 'string') return;
                            
                            // Categorize mistakes by keywords
                            let category = 'Other';
                            if (aspect.toLowerCase().includes('formula') || aspect.toLowerCase().includes('equation')) {
                              category = 'Formulas';
                            } else if (aspect.toLowerCase().includes('concept') || aspect.toLowerCase().includes('theory')) {
                              category = 'Concepts';
                            } else if (aspect.toLowerCase().includes('problem') || aspect.toLowerCase().includes('question')) {
                              category = 'Problem Solving';
                            } else if (aspect.toLowerCase().includes('memory') || aspect.toLowerCase().includes('remember')) {
                              category = 'Memory';
                            } else if (aspect.toLowerCase().includes('calculation') || aspect.toLowerCase().includes('math')) {
                              category = 'Calculations';
                            } else if (aspect.toLowerCase().includes('application') || aspect.toLowerCase().includes('apply')) {
                              category = 'Application';
                            }
                            
                            mistakeMap[category] = (mistakeMap[category] || 0) + 1;
                          });
                        }
                      });
                      
                      const chartData = Object.entries(mistakeMap)
                        .map(([category, count]) => ({
                          category,
                          mistakes: count,
                        }))
                        .sort((a, b) => b.mistakes - a.mistakes);

                      if (chartData.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            <div className="text-center">
                              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">No mistake patterns identified yet</p>
                              <p className="text-xs mt-1">Add reflections about challenging aspects to see patterns</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 20, right: 30, bottom: 60, left: 40 }}
                            >
                              <XAxis 
                                dataKey="category" 
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                              />
                              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                              />
                              <Bar 
                                dataKey="mistakes" 
                                fill="hsl(var(--destructive))" 
                                radius={[8, 8, 0, 0]}
                                name="Difficulty Count"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                {/* Subject Performance Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Subject Performance Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={Object.entries(insights.subjectBreakdown).reduce((acc, [subject], idx) => ({
                        ...acc,
                        [subject]: {
                          label: subject,
                          color: `hsl(var(--chart-${(idx % 5) + 1}))`,
                        }
                      }), {})}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(insights.subjectBreakdown).map(([subject, data]) => ({
                          subject,
                          score: data.confidenceScore,
                          topics: data.topicsCount,
                        }))}>
                          <XAxis dataKey="subject" />
                          <YAxis domain={[0, 10]} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="score" name="Confidence Score" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    
                    <div className="mt-4 space-y-2">
                      {Object.entries(insights.subjectBreakdown).map(([subject, data]) => (
                        <div key={subject} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{subject}</span>
                            <span className="text-muted-foreground">{data.confidenceScore}/10</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{data.summary}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                {/* Learning Patterns Heatmap */}
                {insights.learningPatterns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Learning Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-2">
                        {insights.learningPatterns.map((pattern, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 rounded-lg bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-1 bg-primary rounded-full" />
                              <span className="text-xs font-medium">{pattern}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Focus Areas Heatmap */}
                {insights.recommendedFocus.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recommended Focus Areas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-2">
                        {insights.recommendedFocus.map((area, idx) => {
                          const intensity = 100 - (idx * (100 / insights.recommendedFocus.length));
                          return (
                            <div 
                              key={idx} 
                              className="p-3 rounded-lg border transition-all"
                              style={{
                                backgroundColor: `hsl(var(--destructive) / ${intensity * 0.003})`,
                                borderColor: `hsl(var(--destructive) / ${intensity * 0.004})`,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  className="h-8 w-2 rounded-full"
                                  style={{
                                    backgroundColor: `hsl(var(--destructive) / ${intensity * 0.01})`,
                                  }}
                                />
                                <span className="text-xs font-medium">{area}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Personalized Tips Grid */}
                {insights.personalizedTips.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Personalized Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-2">
                        {insights.personalizedTips.map((tip, idx) => (
                          <div 
                            key={idx} 
                            className="p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 hover:border-green-500/40 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              <span className="text-xs font-medium">{tip}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Peak Study Hours */}
                {insights.peakStudyHours && 
                 insights.peakStudyHours.completionRateByWindow && 
                 insights.peakStudyHours.avgDifficultyByWindow && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        Peak Study Hours Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <h4 className="font-semibold text-sm">Best Performance</h4>
                          </div>
                          <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400 capitalize">
                            {insights.peakStudyHours.bestTimeWindow}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {insights.peakStudyHours.bestTimeRange}
                          </p>
                          <div className="mt-3 space-y-1 text-xs">
                            <p>
                              <span className="font-medium">Completion Rate:</span>{" "}
                              {(insights.peakStudyHours.completionRateByWindow[insights.peakStudyHours.bestTimeWindow as keyof typeof insights.peakStudyHours.completionRateByWindow] * 100).toFixed(0)}%
                            </p>
                            <p>
                              <span className="font-medium">Avg Difficulty:</span>{" "}
                              {insights.peakStudyHours.avgDifficultyByWindow[insights.peakStudyHours.bestTimeWindow as keyof typeof insights.peakStudyHours.avgDifficultyByWindow]?.toFixed(1)}/10
                            </p>
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                            <h4 className="font-semibold text-sm">Most Challenging</h4>
                          </div>
                          <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400 capitalize">
                            {insights.peakStudyHours.worstTimeWindow}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {insights.peakStudyHours.worstTimeRange}
                          </p>
                          <div className="mt-3 space-y-1 text-xs">
                            <p>
                              <span className="font-medium">Completion Rate:</span>{" "}
                              {(insights.peakStudyHours.completionRateByWindow[insights.peakStudyHours.worstTimeWindow as keyof typeof insights.peakStudyHours.completionRateByWindow] * 100).toFixed(0)}%
                            </p>
                            <p>
                              <span className="font-medium">Avg Difficulty:</span>{" "}
                              {insights.peakStudyHours.avgDifficultyByWindow[insights.peakStudyHours.worstTimeWindow as keyof typeof insights.peakStudyHours.avgDifficultyByWindow]?.toFixed(1)}/10
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Time Window Performance Chart */}
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { 
                                window: 'Morning', 
                                completion: insights.peakStudyHours.completionRateByWindow.morning * 100,
                                difficulty: insights.peakStudyHours.avgDifficultyByWindow.morning
                              },
                              { 
                                window: 'Afternoon', 
                                completion: insights.peakStudyHours.completionRateByWindow.afternoon * 100,
                                difficulty: insights.peakStudyHours.avgDifficultyByWindow.afternoon
                              },
                              { 
                                window: 'Evening', 
                                completion: insights.peakStudyHours.completionRateByWindow.evening * 100,
                                difficulty: insights.peakStudyHours.avgDifficultyByWindow.evening
                              },
                            ]}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <XAxis 
                              dataKey="window" 
                              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                            />
                            <YAxis 
                              yAxisId="left"
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                              label={{ value: 'Completion %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              domain={[0, 10]}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                              label={{ value: 'Difficulty', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: 12
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar 
                              yAxisId="left"
                              dataKey="completion" 
                              fill="hsl(var(--primary))" 
                              radius={[8, 8, 0, 0]}
                              name="Completion Rate %"
                            />
                            <Bar 
                              yAxisId="right"
                              dataKey="difficulty" 
                              fill="hsl(var(--destructive))" 
                              radius={[8, 8, 0, 0]}
                              name="Avg Difficulty (1-10)"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Smart Scheduling Recommendation */}
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          Smart Scheduling Recommendation
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {insights.peakStudyHours.recommendation}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
