import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StudyPreferences, DayTimeSlot } from "../OnboardingWizard";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PreferencesStepProps {
  preferences: StudyPreferences;
  setPreferences: (prefs: StudyPreferences) => void;
}

const PreferencesStep = ({ preferences, setPreferences }: PreferencesStepProps) => {
  const weekDays = [
    { value: "monday", label: "Mon" },
    { value: "tuesday", label: "Tue" },
    { value: "wednesday", label: "Wed" },
    { value: "thursday", label: "Thu" },
    { value: "friday", label: "Fri" },
    { value: "saturday", label: "Sat" },
    { value: "sunday", label: "Sun" },
  ];

  const toggleDay = (day: string) => {
    setPreferences({
      ...preferences,
      day_time_slots: preferences.day_time_slots.map((slot) =>
        slot.day === day ? { ...slot, enabled: !slot.enabled } : slot
      ),
    });
  };

  const updateTimeSlot = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setPreferences({
      ...preferences,
      day_time_slots: preferences.day_time_slots.map((slot) =>
        slot.day === day ? { ...slot, [field]: value } : slot
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="daily-hours">Daily Study Hours (Target)</Label>
          <Input
            id="daily-hours"
            type="number"
            min="1"
            max="12"
            value={preferences.daily_study_hours}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                daily_study_hours: parseInt(e.target.value) || 2,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Session & Break Duration Mode</Label>
          <RadioGroup
            value={preferences.duration_mode}
            onValueChange={(value: "fixed" | "flexible") =>
              setPreferences({
                ...preferences,
                duration_mode: value,
              })
            }
            className="space-y-2"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="flexible" id="flexible" className="mt-1" />
              <Label htmlFor="flexible" className="font-normal cursor-pointer text-sm">
                <span className="font-medium">Flexible</span> - AI tailors session length based on task type
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
              <Label htmlFor="fixed" className="font-normal cursor-pointer text-sm">
                <span className="font-medium">Fixed</span> - Use specific durations for all sessions
              </Label>
            </div>
          </RadioGroup>
        </div>

        {preferences.duration_mode === "fixed" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="session-duration" className="text-xs">Session (mins)</Label>
              <Input
                id="session-duration"
                type="number"
                min="15"
                max="120"
                value={preferences.session_duration}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    session_duration: parseInt(e.target.value) || 45,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="break-duration" className="text-xs">Break (mins)</Label>
              <Input
                id="break-duration"
                type="number"
                min="5"
                max="60"
                value={preferences.break_duration}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    break_duration: parseInt(e.target.value) || 15,
                  })
                }
              />
            </div>
          </div>
        )}

        {preferences.duration_mode === "flexible" && (
          <Card className="p-2 bg-muted">
            <p className="text-xs text-muted-foreground">
              AI will adjust: Homework (exact duration), Focus topics (60-90 min), Regular topics (30-45 min)
            </p>
          </Card>
        )}

        <div className="space-y-2">
          <Label>Study Days & Time Periods</Label>
          <ScrollArea className="h-[200px] rounded-md border p-2">
            <div className="space-y-2">
              {weekDays.map((day) => {
                const slot = preferences.day_time_slots.find((s) => s.day === day.value);
                return (
                  <Card key={day.value} className="p-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center space-x-2 min-w-[80px]">
                        <Checkbox
                          id={day.value}
                          checked={slot?.enabled || false}
                          onCheckedChange={() => toggleDay(day.value)}
                        />
                        <label
                          htmlFor={day.value}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {day.label}
                        </label>
                      </div>
                      
                      {slot?.enabled && (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateTimeSlot(day.value, 'startTime', e.target.value)}
                            className="w-24 h-8 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateTimeSlot(day.value, 'endTime', e.target.value)}
                            className="w-24 h-8 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <Label>Additional Time Slots</Label>
          <Card className="p-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="before-school"
                  checked={preferences.study_before_school || false}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      study_before_school: !!checked,
                    })
                  }
                />
                <label htmlFor="before-school" className="text-sm cursor-pointer">
                  Morning sessions before school
                </label>
              </div>
              
              {preferences.study_before_school && (
                <div className="ml-6 flex items-center gap-2">
                  <Input
                    type="time"
                    value={preferences.before_school_start || "07:00"}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        before_school_start: e.target.value,
                      })
                    }
                    className="w-24 h-8 text-xs"
                  />
                  <span className="text-xs">to</span>
                  <Input
                    type="time"
                    value={preferences.before_school_end || "08:00"}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        before_school_end: e.target.value,
                      })
                    }
                    className="w-24 h-8 text-xs"
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="during-lunch"
                  checked={preferences.study_during_lunch || false}
                  onCheckedChange={(checked) =>
                    setPreferences({
                      ...preferences,
                      study_during_lunch: !!checked,
                    })
                  }
                />
                <label htmlFor="during-lunch" className="text-sm cursor-pointer">
                  Study during lunch
                </label>
              </div>
              
              {preferences.study_during_lunch && (
                <div className="ml-6 flex items-center gap-2">
                  <Input
                    type="time"
                    value={preferences.lunch_start || "12:00"}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        lunch_start: e.target.value,
                      })
                    }
                    className="w-24 h-8 text-xs"
                  />
                  <span className="text-xs">to</span>
                  <Input
                    type="time"
                    value={preferences.lunch_end || "12:30"}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        lunch_end: e.target.value,
                      })
                    }
                    className="w-24 h-8 text-xs"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="free-periods"
                checked={preferences.study_during_free_periods || false}
                onCheckedChange={(checked) =>
                  setPreferences({
                    ...preferences,
                    study_during_free_periods: !!checked,
                  })
                }
              />
              <label htmlFor="free-periods" className="text-sm cursor-pointer">
                Study during free periods
              </label>
            </div>
            
            <p className="text-xs text-muted-foreground pt-1 border-t">
              These slots are for quick homework tasks only (15-25 mins)
            </p>
          </Card>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-notes">Notes for AI (Optional)</Label>
          <Textarea
            id="ai-notes"
            placeholder="Any special instructions for the AI..."
            value={preferences.aiNotes || ""}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                aiNotes: e.target.value,
              })
            }
            rows={3}
            className="resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default PreferencesStep;
