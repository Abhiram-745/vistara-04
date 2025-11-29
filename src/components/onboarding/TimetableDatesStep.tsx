import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TimetableDatesStepProps {
  timetableName: string;
  setTimetableName: (name: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
}

const TimetableDatesStep = ({
  timetableName,
  setTimetableName,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: TimetableDatesStepProps) => {
  // Set default dates on mount
  useEffect(() => {
    if (!startDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
    }
    if (!endDate) {
      const oneWeekLater = new Date();
      oneWeekLater.setDate(oneWeekLater.getDate() + 8);
      setEndDate(oneWeekLater.toISOString().split('T')[0]);
    }
  }, []);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    // If end date is before new start date, adjust it
    if (endDate && new Date(endDate) <= new Date(value)) {
      const newEnd = new Date(value);
      newEnd.setDate(newEnd.getDate() + 7);
      setEndDate(newEnd.toISOString().split('T')[0]);
    }
  };

  const getDayCount = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Timetable Period</span>
        </div>
        <h3 className="text-2xl font-bold">When Should Your Timetable Run?</h3>
        <p className="text-muted-foreground">
          Choose the start and end dates for your study timetable
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Timetable Details
          </CardTitle>
          <CardDescription>
            Give your timetable a name and set the date range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                onChange={(e) => handleStartDateChange(e.target.value)}
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

          {startDate && endDate && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-primary" />
                <span>
                  Your timetable will cover <strong>{getDayCount()} days</strong>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-sm text-muted-foreground">
          <Info className="h-4 w-4 inline mr-2" />
          AI will generate study sessions within this date range based on your preferences and available time slots
        </p>
      </div>
    </div>
  );
};

export default TimetableDatesStep;