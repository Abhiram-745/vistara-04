import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { Subject, TestDate } from "../OnboardingWizard";

interface TestDatesStepProps {
  subjects: Subject[];
  testDates: TestDate[];
  setTestDates: (dates: TestDate[]) => void;
}

const TestDatesStep = ({ subjects, testDates, setTestDates }: TestDatesStepProps) => {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [testDate, setTestDate] = useState("");
  const [testType, setTestType] = useState("");

  const addTestDate = () => {
    if (selectedSubject && testDate && testType.trim()) {
      setTestDates([
        ...testDates,
        {
          subject_id: selectedSubject,
          test_date: testDate,
          test_type: testType,
        },
      ]);
      setTestDate("");
      setTestType("");
    }
  };

  const removeTestDate = (index: number) => {
    setTestDates(testDates.filter((_, i) => i !== index));
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s, i) => i.toString() === subjectId);
    return subject?.name || "";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-subject">Select Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-date">Test Date</Label>
            <Input
              id="test-date"
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-type">Test Type</Label>
            <Input
              id="test-type"
              placeholder="e.g., Mock Exam, Final"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && selectedSubject && testDate && addTestDate()}
            />
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={addTestDate}
        disabled={!selectedSubject || !testDate || !testType.trim()}
        className="w-full bg-gradient-secondary hover:opacity-90"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Test Date
      </Button>

      {testDates.length > 0 && (
        <div className="space-y-2">
          <Label>Your Test Dates ({testDates.length})</Label>
          <div className="space-y-2">
            {testDates.map((test, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div>
                  <p className="font-medium">{getSubjectName(test.subject_id)}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(test.test_date).toLocaleDateString("en-GB")} • {test.test_type}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTestDate(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestDatesStep;
