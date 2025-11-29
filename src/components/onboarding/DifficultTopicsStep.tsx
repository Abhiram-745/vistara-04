import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, TrendingUp, AlertCircle, Plus, X, MessageSquare } from "lucide-react";
import { Subject, Topic } from "../OnboardingWizard";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

interface DifficultTopicsStepProps {
  subjects: Subject[];
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;
  onAnalysisComplete: (analysis: any) => void;
  onSkip: () => void;
}

interface FocusTopic {
  name: string;
  subjectId: string;
  confidence: number;
  difficulties: string;
}

const DifficultTopicsStep = ({ subjects, topics, setTopics, onAnalysisComplete, onSkip }: DifficultTopicsStepProps) => {
  const [focusTopics, setFocusTopics] = useState<FocusTopic[]>([]);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [editingTopic, setEditingTopic] = useState<FocusTopic | null>(null);
  const [tempConfidence, setTempConfidence] = useState(5);
  const [tempDifficulties, setTempDifficulties] = useState("");

  // Get the actual subject_id (UUID if exists, otherwise index) - matches TopicsStep logic
  const getSubjectId = (index: number) => {
    const subject = subjects[index];
    return subject?.id || index.toString();
  };

  const getSubjectName = (subjectId: string) => {
    // Try to find by UUID first
    const subjectByUUID = subjects.find(s => s.id === subjectId);
    if (subjectByUUID) return subjectByUUID.name;
    // Fall back to index-based lookup for old data
    const subject = subjects.find((s, i) => i.toString() === subjectId);
    return subject?.name || "";
  };

  // Get the actual subject_id for filtering
  const currentSubjectId = selectedSubjectIndex ? getSubjectId(parseInt(selectedSubjectIndex)) : "";

  const availableTopics = topics.filter(
    (t) => t.subject_id === currentSubjectId && !focusTopics.some(ft => ft.name === t.name && ft.subjectId === t.subject_id)
  );

  const addFocusTopic = () => {
    if (selectedTopic) {
      const topic = topics.find(t => t.name === selectedTopic && t.subject_id === currentSubjectId);
      if (topic) {
        const newFocusTopic: FocusTopic = {
          name: topic.name,
          subjectId: topic.subject_id,
          confidence: topic.confidence || 5,
          difficulties: topic.difficulties || ""
        };
        setFocusTopics([...focusTopics, newFocusTopic]);
        setSelectedTopic("");
        toast.success("Topic added - click on it to add notes about why you struggle");
      }
    }
  };

  const removeFocusTopic = (topicName: string) => {
    setFocusTopics(focusTopics.filter((t) => t.name !== topicName));
  };

  const handleTopicClick = (topic: FocusTopic) => {
    setEditingTopic(topic);
    setTempConfidence(topic.confidence);
    setTempDifficulties(topic.difficulties);
  };

  const handleSaveNotes = () => {
    if (editingTopic) {
      const updatedFocusTopics = focusTopics.map(ft => 
        ft.name === editingTopic.name 
          ? { ...ft, confidence: tempConfidence, difficulties: tempDifficulties }
          : ft
      );
      setFocusTopics(updatedFocusTopics);
      
      // Also update the main topics array
      const updatedTopics = topics.map(t =>
        t.name === editingTopic.name && t.subject_id === editingTopic.subjectId
          ? { ...t, confidence: tempConfidence, difficulties: tempDifficulties }
          : t
      );
      setTopics(updatedTopics);
      
      setEditingTopic(null);
      toast.success("Notes saved! AI will use this when creating your timetable");
    }
  };

  const handleContinue = () => {
    // Create analysis data from focus topics
    if (focusTopics.length > 0) {
      const analysisData = {
        priorities: focusTopics.map(ft => ({
          topic_name: ft.name,
          priority_score: Math.max(1, 10 - ft.confidence), // Lower confidence = higher priority
          reasoning: ft.difficulties || "User marked as difficult"
        })),
        difficult_topics: focusTopics.filter(ft => ft.difficulties).map(ft => ({
          topic_name: ft.name,
          reason: ft.difficulties,
          study_suggestion: `Focus on understanding the concepts you find challenging: ${ft.difficulties}`
        }))
      };
      onAnalysisComplete(analysisData);
    } else {
      onAnalysisComplete(null);
    }
    onSkip();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Focus Topics</span>
        </div>
        <h3 className="text-2xl font-bold">Topics You Find Difficult</h3>
        <p className="text-muted-foreground">
          Select topics you struggle with and tell us why - AI will prioritize these in your timetable
        </p>
      </div>

      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Add Topics You Struggle With
          </CardTitle>
          <CardDescription>
            Click on any topic after adding to explain what you find difficult about it
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject-select">Select Subject</Label>
              <Select value={selectedSubjectIndex} onValueChange={setSelectedSubjectIndex}>
                <SelectTrigger id="subject-select">
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSubjectIndex && (
              <div className="space-y-2">
                <Label htmlFor="topic-select">Select Topic</Label>
                <Select
                  value={selectedTopic}
                  onValueChange={setSelectedTopic}
                  disabled={availableTopics.length === 0}
                >
                  <SelectTrigger id="topic-select">
                    <SelectValue
                      placeholder={
                        availableTopics.length === 0
                          ? "No available topics"
                          : "Choose a topic"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTopics.map((topic, index) => (
                      <SelectItem key={index} value={topic.name}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={addFocusTopic}
            disabled={!selectedTopic}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Focus List
          </Button>

          {focusTopics.length > 0 && (
            <div className="space-y-2 mt-4">
              <Label>Your Focus Topics ({focusTopics.length})</Label>
              <p className="text-xs text-muted-foreground text-amber-600">
                💡 Click on any topic to add notes about why you find it difficult
              </p>
              <div className="space-y-2">
                {focusTopics.map((topic, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors border-2 border-transparent hover:border-primary/30"
                    onClick={() => handleTopicClick(topic)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{topic.name}</p>
                        {topic.difficulties && (
                          <MessageSquare className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getSubjectName(topic.subjectId)}
                      </p>
                      {topic.confidence < 10 && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Confidence: {topic.confidence}/10
                        </Badge>
                      )}
                      {topic.difficulties && (
                        <p className="text-xs text-primary italic mt-1 line-clamp-1">
                          "{topic.difficulties}"
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFocusTopic(topic.name);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 inline mr-2" />
          AI will allocate more study time to topics you mark as difficult and use your notes to create better study suggestions
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => {
            onAnalysisComplete(null);
            onSkip();
          }}
          variant="outline"
          className="flex-1"
        >
          Skip this step
        </Button>
        <Button
          onClick={handleContinue}
          className="flex-1 bg-gradient-primary hover:opacity-90"
        >
          Continue
        </Button>
      </div>

      {/* Notes Dialog */}
      <Dialog open={!!editingTopic} onOpenChange={() => setEditingTopic(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {editingTopic?.name}
            </DialogTitle>
            <DialogDescription>
              Tell us why you find this topic difficult - AI will use this to help you better
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>How confident are you with this topic?</Label>
              <div className="px-2">
                <Slider
                  value={[tempConfidence]}
                  onValueChange={(v) => setTempConfidence(v[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-muted-foreground">Not confident</span>
                  <span className="text-lg font-bold text-primary">{tempConfidence}/10</span>
                  <span className="text-xs text-muted-foreground">Very confident</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>What do you find difficult about this topic?</Label>
              <Textarea
                placeholder="e.g., I struggle with remembering the formulas... The concepts are confusing when... I always make mistakes with..."
                value={tempDifficulties}
                onChange={(e) => setTempDifficulties(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                This helps AI understand your specific challenges and create better study suggestions
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTopic(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DifficultTopicsStep;