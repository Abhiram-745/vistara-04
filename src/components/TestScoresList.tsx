import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CheckCircle2, XCircle, Sparkles, Target } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface TestScore {
  id: string;
  subject: string;
  test_type: string;
  test_date: string;
  total_marks: number;
  marks_obtained: number;
  percentage: number;
  questions_correct: any[];
  questions_incorrect: any[];
  ai_analysis: any;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  created_at: string;
}

interface TestScoresListProps {
  userId: string;
  refresh?: number;
}

export const TestScoresList = ({ userId, refresh }: TestScoresListProps) => {
  const [scores, setScores] = useState<TestScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores();
  }, [userId, refresh]);

  const fetchScores = async () => {
    try {
      const { data, error } = await supabase
        .from("test_scores")
        .select("*")
        .eq("user_id", userId)
        .order("test_date", { ascending: false });

      if (error) throw error;
      setScores((data as TestScore[]) || []);
    } catch (error) {
      console.error("Error fetching test scores:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (percentage >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return "A*";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    if (percentage >= 40) return "E";
    return "U";
  };

  if (loading) {
    return <div className="text-center py-8">Loading test scores...</div>;
  }

  if (scores.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No test scores yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first test score to track your progress
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {scores.map((score) => (
        <Collapsible key={score.id}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{score.subject}</CardTitle>
                    <CardDescription>
                      {score.test_type} • {new Date(score.test_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-lg border-2 font-bold text-lg ${getGradeColor(score.percentage)}`}>
                      {getGrade(score.percentage)}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{score.percentage.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {score.marks_obtained}/{score.total_marks}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4 pt-4 border-t">
                {/* Questions Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Correct ({score.questions_correct?.length || 0})
                    </div>
                    {score.questions_correct && score.questions_correct.length > 0 ? (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {score.questions_correct.map((q: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span>{q.question}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No details provided</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                      <XCircle className="h-4 w-4" />
                      Incorrect ({score.questions_incorrect?.length || 0})
                    </div>
                    {score.questions_incorrect && score.questions_incorrect.length > 0 ? (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {score.questions_incorrect.map((q: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-500">✗</span>
                            <span>{q.question}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No details provided</p>
                    )}
                  </div>
                </div>

                {/* AI Analysis */}
                {(score.strengths?.length > 0 || score.weaknesses?.length > 0 || score.recommendations?.length > 0) && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-accent" />
                      AI Analysis
                    </div>

                    {score.strengths && score.strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          Strengths
                        </h4>
                        <ul className="text-sm space-y-1">
                          {score.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-green-500 mt-0.5">•</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {score.weaknesses && score.weaknesses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-orange-600">
                          <TrendingDown className="h-4 w-4" />
                          Areas for Improvement
                        </h4>
                        <ul className="text-sm space-y-1">
                          {score.weaknesses.map((weakness, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-orange-500 mt-0.5">•</span>
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {score.recommendations && score.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-primary">
                          <Target className="h-4 w-4" />
                          Recommendations
                        </h4>
                        <ul className="text-sm space-y-1">
                          {score.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-primary mt-0.5">→</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};

export default TestScoresList;
