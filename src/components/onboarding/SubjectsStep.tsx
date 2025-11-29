import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Calendar, Clock, BookOpen } from "lucide-react";
import { Subject } from "../OnboardingWizard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SubjectsStepProps {
  subjects: Subject[];
  setSubjects: (subjects: Subject[]) => void;
}

const GCSE_SUBJECTS = [
  "Mathematics",
  "English Language",
  "English Literature",
  "Biology",
  "Chemistry",
  "Physics",
  "Combined Science",
  "History",
  "Geography",
  "French",
  "Spanish",
  "German",
  "Computer Science",
  "Business Studies",
  "Economics",
  "Psychology",
  "Sociology",
  "Religious Studies",
  "Art & Design",
  "Drama",
  "Music",
  "Physical Education",
  "Food Technology",
  "Design & Technology",
];

const EXAM_BOARDS = [
  "AQA",
  "Edexcel",
  "OCR",
  "WJEC",
  "CCEA",
  "Eduqas",
];

const SubjectsStep = ({ subjects, setSubjects }: SubjectsStepProps) => {
  const [subjectName, setSubjectName] = useState("");
  const [examBoard, setExamBoard] = useState("");
  const [mode, setMode] = useState<"short-term-exam" | "long-term-exam" | "no-exam">("long-term-exam");

  const addSubject = () => {
    if (subjectName.trim() && examBoard.trim()) {
      setSubjects([...subjects, { 
        id: crypto.randomUUID(),
        name: subjectName, 
        exam_board: examBoard,
        mode: mode
      }]);
      setSubjectName("");
      setExamBoard("");
      setMode("long-term-exam");
    }
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const getModeInfo = (mode: Subject["mode"]) => {
    switch (mode) {
      case "short-term-exam":
        return { icon: Calendar, label: "Short-Term", color: "destructive", description: "1-4 weeks" };
      case "long-term-exam":
        return { icon: Clock, label: "Long-Term", color: "primary", description: "5-8+ weeks" };
      case "no-exam":
        return { icon: BookOpen, label: "No Exam", color: "secondary", description: "Getting ahead" };
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="subject-name" className="text-sm">Subject</Label>
          <Select value={subjectName} onValueChange={setSubjectName}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50 max-h-[200px]">
              {GCSE_SUBJECTS.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="exam-board" className="text-sm">Exam Board</Label>
          <Select value={examBoard} onValueChange={setExamBoard}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select exam board" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {EXAM_BOARDS.map((board) => (
                <SelectItem key={board} value={board}>
                  {board}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="space-y-2">
        <Label className="text-sm">Study Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["short-term-exam", "long-term-exam", "no-exam"] as const).map((m) => {
            const info = getModeInfo(m);
            const Icon = info.icon;
            return (
              <Card
                key={m}
                className={`p-2 cursor-pointer transition-all hover:shadow-md ${
                  mode === m ? "border-2 border-primary bg-primary/5" : "border"
                }`}
                onClick={() => setMode(m)}
              >
                <div className="flex flex-col items-center text-center gap-1">
                  <Icon className={`h-4 w-4 ${mode === m ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className={`text-xs font-medium ${mode === m ? "text-primary" : ""}`}>
                      {info.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{info.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        onClick={addSubject}
        disabled={!subjectName.trim() || !examBoard.trim()}
        className="w-full bg-gradient-secondary hover:opacity-90"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Subject
      </Button>

      {subjects.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Your Subjects ({subjects.length})</Label>
          <ScrollArea className="h-[150px] rounded-md border p-2">
            <div className="space-y-2">
              {subjects.map((subject, index) => {
                const info = getModeInfo(subject.mode);
                const Icon = info.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{subject.name}</p>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          <Icon className="h-3 w-3 mr-1" />
                          {info.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{subject.exam_board}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubject(index)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SubjectsStep;
