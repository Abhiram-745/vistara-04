import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, TrendingUp, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { triggerConfetti } from "@/utils/celebrations";

interface TestDate {
  id: string;
  subject_id: string;
  test_date: string;
  test_type: string;
}

interface TestScoreEntryProps {
  userId: string;
  onScoreAdded?: () => void;
}

export const TestScoreEntry = ({ userId, onScoreAdded }: TestScoreEntryProps) => {
  const [open, setOpen] = useState(false);
  const [testDates, setTestDates] = useState<TestDate[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [selectedTestDateId, setSelectedTestDateId] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [marksObtained, setMarksObtained] = useState("");
  const [questionsCorrect, setQuestionsCorrect] = useState("");
  const [questionsIncorrect, setQuestionsIncorrect] = useState("");

  useEffect(() => {
    if (open) {
      fetchTestDates();
      fetchSubjects();
    }
  }, [open]);

  const fetchTestDates = async () => {
    const { data, error } = await supabase
      .from("test_dates")
      .select("*")
      .order("test_date", { ascending: false });

    if (!error && data) {
      setTestDates(data);
    }
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("user_id", userId);

    if (!error && data) {
      setSubjects(data);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTestDateId || !totalMarks || !marksObtained) {
      toast.error("Please fill in all required fields");
      return;
    }

    const total = parseInt(totalMarks);
    const obtained = parseInt(marksObtained);

    if (obtained > total) {
      toast.error("Marks obtained cannot be greater than total marks");
      return;
    }

    setLoading(true);

    try {
      const selectedTest = testDates.find(t => t.id === selectedTestDateId);
      if (!selectedTest) throw new Error("Test not found");

      const subject = subjects.find(s => s.id === selectedTest.subject_id);
      const percentage = (obtained / total) * 100;

      // Parse questions data
      const correctQuestions = questionsCorrect
        .split("\n")
        .filter(q => q.trim())
        .map(q => ({ question: q.trim(), topic: "" }));

      const incorrectQuestions = questionsIncorrect
        .split("\n")
        .filter(q => q.trim())
        .map(q => ({ question: q.trim(), topic: "" }));

      // Insert test score
      const { data: scoreData, error: insertError } = await supabase
        .from("test_scores")
        .insert({
          user_id: userId,
          test_date_id: selectedTestDateId,
          subject: subject?.name || "Unknown",
          test_type: selectedTest.test_type,
          test_date: selectedTest.test_date,
          total_marks: total,
          marks_obtained: obtained,
          percentage: percentage,
          questions_correct: correctQuestions,
          questions_incorrect: incorrectQuestions,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Test score saved successfully!");
      triggerConfetti('success');
      
      // Trigger AI analysis
      setAnalyzing(true);
      await analyzeTestScore(scoreData.id, {
        subject: subject?.name || "Unknown",
        percentage,
        correctQuestions,
        incorrectQuestions,
        testType: selectedTest.test_type,
      });

      setOpen(false);
      resetForm();
      onScoreAdded?.();
    } catch (error: any) {
      console.error("Error saving test score:", error);
      toast.error(error.message || "Failed to save test score");
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const analyzeTestScore = async (scoreId: string, data: any) => {
    try {
      const { error } = await supabase.functions.invoke("analyze-test-score", {
        body: {
          scoreId,
          subject: data.subject,
          percentage: data.percentage,
          correctQuestions: data.correctQuestions,
          incorrectQuestions: data.incorrectQuestions,
          testType: data.testType,
        },
      });

      if (error) throw error;
      toast.success("AI analysis completed!");
    } catch (error) {
      console.error("Error analyzing test score:", error);
      toast.error("AI analysis failed, but score was saved");
    }
  };

  const resetForm = () => {
    setSelectedTestDateId("");
    setTotalMarks("");
    setMarksObtained("");
    setQuestionsCorrect("");
    setQuestionsIncorrect("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Test Score
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Enter Test Score
          </DialogTitle>
          <DialogDescription>
            Record your test results and get AI-powered analysis of your performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2" data-tour="test-select">
            <Label htmlFor="test-select">Select Test *</Label>
            <Select value={selectedTestDateId} onValueChange={setSelectedTestDateId}>
              <SelectTrigger id="test-select">
                <SelectValue placeholder="Choose a test..." />
              </SelectTrigger>
              <SelectContent>
                {testDates.map((test) => {
                  const subject = subjects.find(s => s.id === test.subject_id);
                  return (
                    <SelectItem key={test.id} value={test.id}>
                      {subject?.name} - {test.test_type} ({new Date(test.test_date).toLocaleDateString()})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2" data-tour="total-marks">
              <Label htmlFor="total-marks">Total Marks *</Label>
              <Input
                id="total-marks"
                type="number"
                min="0"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g., 100"
              />
            </div>
            <div className="space-y-2" data-tour="marks-obtained">
              <Label htmlFor="marks-obtained">Marks Obtained *</Label>
              <Input
                id="marks-obtained"
                type="number"
                min="0"
                value={marksObtained}
                onChange={(e) => setMarksObtained(e.target.value)}
                placeholder="e.g., 85"
              />
            </div>
          </div>

          {totalMarks && marksObtained && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Percentage:</span>
                  <span className="text-2xl font-bold text-primary">
                    {((parseInt(marksObtained) / parseInt(totalMarks)) * 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2" data-tour="questions-correct">
            <Label htmlFor="correct" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Questions You Got Correct
            </Label>
            <Textarea
              id="correct"
              value={questionsCorrect}
              onChange={(e) => setQuestionsCorrect(e.target.value)}
              placeholder="Enter each question on a new line, e.g.:&#10;Quadratic equations&#10;Circle theorems&#10;Trigonometry"
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              List topics or questions you answered correctly (one per line)
            </p>
          </div>

          <div className="space-y-2" data-tour="questions-wrong">
            <Label htmlFor="incorrect" className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Questions You Got Wrong
            </Label>
            <Textarea
              id="incorrect"
              value={questionsIncorrect}
              onChange={(e) => setQuestionsIncorrect(e.target.value)}
              placeholder="Enter each question on a new line, e.g.:&#10;Simultaneous equations&#10;Probability trees&#10;Graphs"
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              List topics or questions you got wrong (one per line)
            </p>
          </div>

          <Card className="bg-accent/5 border-accent/20" data-tour="ai-analysis">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                After saving, our AI will analyze your results to identify strengths, weaknesses, and provide personalized recommendations for improvement.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading || analyzing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || analyzing} className="gap-2">
            {(loading || analyzing) && <Loader2 className="h-4 w-4 animate-spin" />}
            {analyzing ? "Analyzing..." : loading ? "Saving..." : "Save & Analyze"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestScoreEntry;
