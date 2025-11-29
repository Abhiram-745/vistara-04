import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, TrendingUp, TrendingDown, Lightbulb, Target, Loader2, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import PaywallDialog from "@/components/PaywallDialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ChartCard = ({ title, icon, children, className = "" }: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <Card className={`border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 ${className}`}>
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ScatterChart,
  Scatter,
  CartesianGrid,
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

interface StudyInsightsPanelProps {
  timetableId: string;
}

interface Insight {
  strugglingTopics: Array<{
    topic: string;
    subject: string;
    severity: string;
    reason: string;
    quotes: string[];
    avgDifficulty?: number;
    avgFocusLevel?: number;
  }>;
  strongAreas: Array<{
    topic: string;
    subject: string;
    reason: string;
    quotes: string[];
    avgDifficulty?: number;
    avgFocusLevel?: number;
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

// Helper function to normalize completion rate (handle both 0-1 and 0-100 formats)
const normalizeCompletionRate = (rate: number): number => {
  if (rate > 1) {
    // Already a percentage (0-100), just return
    return Math.min(rate, 100);
  }
  // Decimal (0-1), convert to percentage
  return rate * 100;
};

// Helper function to normalize difficulty (ensure 1-10 scale)
const normalizeDifficulty = (difficulty: number): number => {
  if (difficulty > 10) {
    // Likely on 0-100 scale, convert to 1-10
    return Math.min(difficulty / 10, 10);
  }
  return Math.min(difficulty, 10);
};

export const StudyInsightsPanel = ({ timetableId }: StudyInsightsPanelProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [reflections, setReflections] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    fetchReflections();
    fetchExistingInsights();
  }, [timetableId]);

  const fetchReflections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("topic_reflections")
      .select("*")
      .eq("timetable_id", timetableId)
      .eq("user_id", user.id);

    setReflections(data || []);
  };

  const fetchExistingInsights = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("study_insights")
      .select("*")
      .eq("timetable_id", timetableId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.insights_data) {
      setInsights(data.insights_data as unknown as Insight);
    }
  };

  const [showPaywall, setShowPaywall] = useState(false);

  const generateInsights = async () => {
    // Check paywall limits first
    const { checkCanGenerateAIInsights, incrementUsage } = await import("@/hooks/useUserRole");
    const canGenerate = await checkCanGenerateAIInsights();
    
    if (!canGenerate) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { timetableId }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setInsights(data.insights);
      
      // Increment usage after successful generation
      await incrementUsage("ai_insights", queryClient);
      
      toast.success("AI Insights generated!");
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

  const selectedReflection = selectedTopic 
    ? reflections.find(r => r.topic === selectedTopic)
    : null;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-amber-50/30 to-orange-50/20 dark:from-amber-950/10 dark:to-orange-950/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Study Insights
              </CardTitle>
              <CardDescription>
                Personalized analysis based on your reflections and study patterns
              </CardDescription>
            </div>
            <Button
              onClick={generateInsights}
              disabled={loading || reflections.length === 0}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Analyzing..." : insights ? "Refresh Insights" : "Generate Insights"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {reflections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Complete study sessions and add reflections to generate AI insights!
            </p>
          )}

          {insights && (
            <div className="space-y-6 pt-4 border-t">
              {/* Overall Summary */}
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm">{insights.overallSummary}</p>
              </div>

              {/* Key Metrics Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-card rounded-xl border shadow-sm">
                  <div className="text-3xl font-display font-bold text-foreground">
                    {insights.strugglingTopics.length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Topics to Focus</div>
                </div>
                <div className="text-center p-4 bg-card rounded-xl border shadow-sm">
                  <div className="text-3xl font-display font-bold text-foreground">
                    {insights.strongAreas.length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Strong Areas</div>
                </div>
                <div className="text-center p-4 bg-card rounded-xl border shadow-sm">
                  <div className="text-3xl font-display font-bold text-emerald-600">
                    {Object.keys(insights.subjectBreakdown).length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Subjects Analyzed</div>
                </div>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="peak-hours">Peak Hours</TabsTrigger>
                </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                      {/* Topic Confidence Scatter Chart */}
                      <ChartCard title="Topic Confidence Map" icon={<Target className="h-4 w-4" />}>
                        {(() => {
                          // Build scatter chart data with reasons
                          const heatmapChartData: Array<{
                            index: number;
                            topic: string;
                            subject: string;
                            confidence: number;
                            reason: string;
                            type: string;
                          }> = [];

                          // Add struggling topics with reasons
                          insights.strugglingTopics.forEach((t, idx) => {
                            const confidence = t.avgFocusLevel 
                              ? Math.max(1, Math.min(10, t.avgFocusLevel / 10))
                              : Math.max(1, Math.min(10, 11 - (t.avgDifficulty || 7)));
                            
                            heatmapChartData.push({
                              index: idx,
                              topic: t.topic,
                              subject: t.subject,
                              confidence,
                              reason: t.reason || "Needs more practice",
                              type: 'struggling'
                            });
                          });

                          // Add strong areas with reasons
                          insights.strongAreas.forEach((t, idx) => {
                            const confidence = t.avgFocusLevel 
                              ? Math.max(1, Math.min(10, t.avgFocusLevel / 10))
                              : Math.max(1, Math.min(10, 11 - (t.avgDifficulty || 3)));
                            
                            heatmapChartData.push({
                              index: insights.strugglingTopics.length + idx,
                              topic: t.topic,
                              subject: t.subject,
                              confidence,
                              reason: t.reason || "Strong understanding",
                              type: 'strong'
                            });
                          });

                          return heatmapChartData.length > 0 ? (
                            <div className="space-y-4">
                              <ResponsiveContainer width="100%" height={300}>
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 40 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                  <XAxis 
                                    dataKey="index" 
                                    name="Topic" 
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                    label={{ value: 'Topics', position: 'insideBottom', offset: -10, style: { fill: 'hsl(var(--muted-foreground))' } }}
                                  />
                                  <YAxis 
                                    dataKey="confidence" 
                                    name="Confidence" 
                                    domain={[0, 10]}
                                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                    label={{ value: 'Confidence Level', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                                  />
                                  <RechartsTooltip
                                    content={({ payload }) => {
                                      if (!payload || !payload.length) return null;
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-card border rounded-lg p-3 shadow-lg max-w-xs">
                                          <p className="font-semibold text-sm">{data.topic}</p>
                                          <p className="text-xs text-muted-foreground mb-2">{data.subject}</p>
                                          <div className="flex items-center gap-2 mb-2">
                                            <div 
                                              className={`w-3 h-3 rounded-full ${
                                                data.confidence >= 7 ? 'bg-emerald-500' : 
                                                data.confidence >= 4 ? 'bg-yellow-400' : 'bg-red-500'
                                              }`} 
                                            />
                                            <span className="text-sm">Confidence: {data.confidence.toFixed(1)}/10</span>
                                          </div>
                                          {data.reason && (
                                            <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                                              <span className="font-medium">
                                                {data.type === 'struggling' ? 'Why it\'s hard: ' : 'Why you excel: '}
                                              </span>
                                              {data.reason}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    }}
                                  />
                                  <Scatter 
                                    name="Topics" 
                                    data={heatmapChartData}
                                    shape={(props: any) => {
                                      const { cx, cy, payload } = props;
                                      const color = payload.confidence >= 7 ? '#22c55e' : 
                                                   payload.confidence >= 4 ? '#facc15' : '#ef4444';
                                      return (
                                        <circle 
                                          cx={cx} 
                                          cy={cy} 
                                          r={10} 
                                          fill={color}
                                          stroke="white"
                                          strokeWidth={2}
                                          style={{ cursor: 'pointer' }}
                                        />
                                      );
                                    }}
                                  />
                                </ScatterChart>
                              </ResponsiveContainer>

                              {/* Legend */}
                              <div className="flex items-center justify-center gap-6 text-xs border-t pt-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-emerald-500" />
                                  <span>High Confidence (7-10)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-yellow-400" />
                                  <span>Medium (4-6)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-red-500" />
                                  <span>Low (1-3)</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No topic confidence data available yet
                            </p>
                          );
                        })()}
                      </ChartCard>

                      {/* Topics Performance Table */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Topics Performance
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Topics Needing Focus */}
                            {insights.strugglingTopics.length > 0 && (
                              <div>
                                <h4 className="text-xs sm:text-sm font-semibold mb-3 flex items-center gap-2">
                                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                                  Needs Focus ({insights.strugglingTopics.length})
                                </h4>
                                <div className="border rounded-lg overflow-x-auto">
                                  <table className="w-full min-w-[600px]">
                                    <thead className="bg-muted/50">
                                      <tr>
                                        <th className="text-left p-2 sm:p-3 text-xs font-medium">Topic</th>
                                        <th className="text-left p-2 sm:p-3 text-xs font-medium hidden sm:table-cell">Subject</th>
                                        <th className="text-left p-2 sm:p-3 text-xs font-medium">Priority</th>
                                        <th className="text-left p-2 sm:p-3 text-xs font-medium">Issue</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {insights.strugglingTopics.map((topic, idx) => (
                                        <tr 
                                          key={idx}
                                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                                          onClick={() => setSelectedTopic(topic.topic)}
                                        >
                                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{topic.topic}</td>
                                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">{topic.subject}</td>
                                          <td className="p-2 sm:p-3">
                                            <Badge variant={getSeverityColor(topic.severity) as any} className="text-[10px] sm:text-xs">
                                              {topic.severity}
                                            </Badge>
                                          </td>
                                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground max-w-[200px] sm:max-w-md truncate">
                                            {topic.reason}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Strong Topics */}
                            {insights.strongAreas.length > 0 && (
                              <div>
                                <h4 className="text-xs sm:text-sm font-semibold mb-3 flex items-center gap-2">
                                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                  Strengths ({insights.strongAreas.length})
                                </h4>
                                <div className="border rounded-lg overflow-x-auto">
                                  <table className="w-full min-w-[500px]">
                                    <thead className="bg-green-50 dark:bg-green-950/20">
                                      <tr>
                                        <th className="text-left p-2 sm:p-3 text-xs font-medium">Topic</th>
                                        <th className="text-left p-2 sm:p-3 text-xs font-medium hidden sm:table-cell">Subject</th>
                                        <th className="text-left p-2 sm:p-3 text-xs font-medium">Why You Excel</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {insights.strongAreas.map((area, idx) => (
                                        <tr 
                                          key={idx}
                                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                                          onClick={() => setSelectedTopic(area.topic)}
                                        >
                                          <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium">{area.topic}</td>
                                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">{area.subject}</td>
                                          <td className="p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground max-w-[200px] sm:max-w-md truncate">
                                            {area.reason}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {insights.strugglingTopics.length === 0 && insights.strongAreas.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                No topic performance data available yet
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-6">
                      {/* Subject Performance Bar Chart */}
                      <ChartCard title="Subject Performance Breakdown" icon={<BarChart3 className="h-4 w-4" />}>
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
                              <XAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <YAxis domain={[0, 10]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <RechartsTooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Bar dataKey="score" name="Confidence Score" fill="#22c55e" radius={[8, 8, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-emerald-500" />
                              <span className="text-muted-foreground">Confidence Score</span>
                            </div>
                          </div>
                          
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
                      </ChartCard>

                      {/* Struggling vs Strong Topics */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-destructive" />
                              Topics Needing Focus
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {insights.strugglingTopics.map((topic, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => setSelectedTopic(topic.topic)}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{topic.topic}</span>
                                    <Badge variant={getSeverityColor(topic.severity) as any} className="text-xs">
                                      {topic.severity}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{topic.subject}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Your Strengths
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {insights.strongAreas.map((area, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-green-50 dark:bg-green-950/20"
                                  onClick={() => setSelectedTopic(area.topic)}
                                >
                                  <div className="font-medium text-sm">{area.topic}</div>
                                  <p className="text-xs text-muted-foreground">{area.subject}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="insights" className="space-y-4">
                      {/* Personalized Tips */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-600" />
                            Personalized Study Tips
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            {insights.personalizedTips.map((tip, idx) => (
                              <li key={idx} className="flex gap-2 p-2 rounded bg-muted/50">
                                <span className="text-primary mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Learning Patterns */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Learning Patterns Detected
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            {insights.learningPatterns.map((pattern, idx) => (
                              <li key={idx} className="flex gap-2 p-2 rounded bg-muted/50">
                                <span className="text-primary mt-1">•</span>
                                <span>{pattern}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Recommended Focus */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Recommended Focus Areas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            {insights.recommendedFocus.map((focus, idx) => (
                              <li key={idx} className="flex gap-2 p-2 rounded bg-muted/50">
                                <span className="text-primary mt-1">•</span>
                                <span>{focus}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                    </TabsContent>

                    <TabsContent value="peak-hours" className="space-y-4">
                      {insights.peakStudyHours ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <TrendingUp className="h-5 w-5 text-green-600" />
                                  <h4 className="font-semibold text-sm">Best Performance</h4>
                                </div>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400 capitalize">
                                  {insights.peakStudyHours.bestTimeWindow}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {insights.peakStudyHours.bestTimeRange}
                                </p>
                                 <div className="mt-3 space-y-1 text-xs">
                                   <p>
                                     <span className="font-medium">Completion Rate:</span>{" "}
                                     {normalizeCompletionRate(insights.peakStudyHours.completionRateByWindow[insights.peakStudyHours.bestTimeWindow as keyof typeof insights.peakStudyHours.completionRateByWindow]).toFixed(0)}%
                                   </p>
                                   <p>
                                     <span className="font-medium">Avg Difficulty:</span>{" "}
                                     {normalizeDifficulty(insights.peakStudyHours.avgDifficultyByWindow[insights.peakStudyHours.bestTimeWindow as keyof typeof insights.peakStudyHours.avgDifficultyByWindow] || 0).toFixed(1)}/10
                                   </p>
                                 </div>
                              </CardContent>
                            </Card>

                            <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <TrendingDown className="h-5 w-5 text-red-600" />
                                  <h4 className="font-semibold text-sm">Most Challenging</h4>
                                </div>
                                <p className="text-2xl font-bold text-red-700 dark:text-red-400 capitalize">
                                  {insights.peakStudyHours.worstTimeWindow}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {insights.peakStudyHours.worstTimeRange}
                                </p>
                                 <div className="mt-3 space-y-1 text-xs">
                                   <p>
                                     <span className="font-medium">Completion Rate:</span>{" "}
                                     {normalizeCompletionRate(insights.peakStudyHours.completionRateByWindow[insights.peakStudyHours.worstTimeWindow as keyof typeof insights.peakStudyHours.completionRateByWindow]).toFixed(0)}%
                                   </p>
                                   <p>
                                     <span className="font-medium">Avg Difficulty:</span>{" "}
                                     {normalizeDifficulty(insights.peakStudyHours.avgDifficultyByWindow[insights.peakStudyHours.worstTimeWindow as keyof typeof insights.peakStudyHours.avgDifficultyByWindow] || 0).toFixed(1)}/10
                                   </p>
                                 </div>
                              </CardContent>
                            </Card>
                          </div>

                          <ChartCard title="Performance by Time Window" icon={<Clock className="h-4 w-4" />}>
                            <p className="text-sm text-muted-foreground mb-4">
                              Your most productive times based on session completion rates
                            </p>
                            <div className="h-[250px] sm:h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                   data={[
                                     {
                                       window: "Morning",
                                       completion: parseFloat(normalizeCompletionRate(insights.peakStudyHours.completionRateByWindow.morning).toFixed(0)),
                                       difficulty: normalizeDifficulty(insights.peakStudyHours.avgDifficultyByWindow.morning || 0),
                                     },
                                     {
                                       window: "Afternoon",
                                       completion: parseFloat(normalizeCompletionRate(insights.peakStudyHours.completionRateByWindow.afternoon).toFixed(0)),
                                       difficulty: normalizeDifficulty(insights.peakStudyHours.avgDifficultyByWindow.afternoon || 0),
                                     },
                                     {
                                       window: "Evening",
                                       completion: parseFloat(normalizeCompletionRate(insights.peakStudyHours.completionRateByWindow.evening).toFixed(0)),
                                       difficulty: normalizeDifficulty(insights.peakStudyHours.avgDifficultyByWindow.evening || 0),
                                     },
                                   ]}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                >
                                  <XAxis 
                                    dataKey="window" 
                                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                                  />
                                   <YAxis 
                                     tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                   />
                                   <RechartsTooltip
                                     contentStyle={{
                                       backgroundColor: 'hsl(var(--card))',
                                       border: '1px solid hsl(var(--border))',
                                       borderRadius: '8px',
                                       fontSize: 12
                                     }}
                                   />
                                  <Bar 
                                    dataKey="completion" 
                                    name="Completion Rate %" 
                                    fill="#22c55e" 
                                    radius={[8, 8, 0, 0]} 
                                  />
                                  <Bar 
                                    dataKey="difficulty" 
                                    name="Avg Difficulty (1-10)" 
                                    fill="hsl(var(--destructive))" 
                                    radius={[8, 8, 0, 0]} 
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </ChartCard>

                          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                            <CardContent className="p-4">
                              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-blue-600" />
                                Smart Scheduling Recommendation
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {insights.peakStudyHours.recommendation}
                              </p>
                            </CardContent>
                          </Card>
                        </>
                      ) : (
                        <Card>
                          <CardContent className="py-8">
                            <div className="text-center text-muted-foreground">
                              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">No peak study hours data yet</p>
                              <p className="text-xs mt-1">Complete more study sessions with difficulty ratings to see your peak performance times</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Topic Detail */}
      {selectedTopic && selectedReflection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Notes: {selectedTopic}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedReflection.reflection_data.easyAspects?.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Easy Aspects:</h4>
                <div className="space-y-2">
                  {selectedReflection.reflection_data.easyAspects.map((item: any, idx: number) => (
                    <div key={idx}>
                      {item.type === "text" ? (
                        <p className="text-sm bg-muted p-2 rounded">{item.content}</p>
                      ) : (
                        <img src={item.content} alt="Note" className="rounded max-h-32" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReflection.reflection_data.hardAspects?.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Challenging Aspects:</h4>
                <div className="space-y-2">
                  {selectedReflection.reflection_data.hardAspects.map((item: any, idx: number) => (
                    <div key={idx}>
                      {item.type === "text" ? (
                        <p className="text-sm bg-muted p-2 rounded">{item.content}</p>
                      ) : (
                        <img src={item.content} alt="Note" className="rounded max-h-32" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReflection.reflection_data.generalNotes?.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">General Notes:</h4>
                <div className="space-y-2">
                  {selectedReflection.reflection_data.generalNotes.map((item: any, idx: number) => (
                    <div key={idx}>
                      {item.type === "text" ? (
                        <p className="text-sm bg-muted p-2 rounded">{item.content}</p>
                      ) : (
                        <img src={item.content} alt="Note" className="rounded max-h-32" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReflection.reflection_data.overallFeeling && (
              <div>
                <h4 className="font-medium text-sm mb-2">Overall Feeling:</h4>
                <p className="text-sm bg-muted p-2 rounded">
                  {selectedReflection.reflection_data.overallFeeling}
                </p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTopic(null)}
              className="w-full"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}
      
      <PaywallDialog
        open={showPaywall}
        onOpenChange={setShowPaywall}
        limitType="ai_insights"
      />
    </div>
  );
};
