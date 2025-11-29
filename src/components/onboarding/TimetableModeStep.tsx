import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimetableMode = "short-term-exam" | "long-term-exam" | "no-exam";

interface TimetableModeStepProps {
  selectedMode: TimetableMode | null;
  onModeSelect: (mode: TimetableMode) => void;
}

const TimetableModeStep = ({ selectedMode, onModeSelect }: TimetableModeStepProps) => {
  const modes = [
    {
      id: "short-term-exam" as TimetableMode,
      icon: Calendar,
      title: "Short-Term Exam Prep",
      description: "Intensive revision schedule for exams within 1-4weeks",
      features: [
        "High-intensity study sessions",
        "Focused exam practice",
        "Minimal homework time",
        "Daily revision of key topics",
      ],
      color: "destructive",
      gradient: "from-destructive/20 to-destructive/5",
    },
    {
      id: "long-term-exam" as TimetableMode,
      icon: Clock,
      title: "Long-Term Exam Prep",
      description: "Balanced revision with spaced repetition over 5-8+ weeks.",
      features: [
        "Spaced repetition schedule",
        "Balanced study sessions",
        "Adequate homework time",
        "Gradual topic coverage",
      ],
      color: "primary",
      gradient: "from-primary/20 to-primary/5",
    },
    {
      id: "no-exam" as TimetableMode,
      icon: BookOpen,
      title: "No Exam Focus",
      description: "Homework-focused schedule with light revision",
      features: [
        "Homework-centric planning",
        "Relaxed revision sessions",
        "Flexible study pace",
        "Topic maintenance only",
      ],
      color: "secondary",
      gradient: "from-secondary/20 to-secondary/5",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-display font-semibold">Choose Your Timetable Mode</h3>
        <p className="text-sm text-muted-foreground">
          Select the mode that best fits your current study goals
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <Card
              key={mode.id}
              className={cn(
                "relative cursor-pointer transition-all duration-300 hover:shadow-lg border-2",
                isSelected
                  ? `border-${mode.color} bg-gradient-to-br ${mode.gradient}`
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onModeSelect(mode.id)}
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-lg",
                      isSelected
                        ? `bg-${mode.color}/20`
                        : "bg-muted"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6",
                        isSelected ? `text-${mode.color}` : "text-muted-foreground"
                      )}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-display font-semibold">{mode.title}</h4>
                      {isSelected && (
                        <CheckCircle2 className={`h-5 w-5 text-${mode.color}`} />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {mode.description}
                    </p>

                    <div className="space-y-2">
                      {mode.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isSelected ? `bg-${mode.color}` : "bg-muted-foreground"
                            )}
                          />
                          <span className={isSelected ? "text-foreground" : "text-muted-foreground"}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          💡 Tip: You can change your timetable mode later by regenerating your schedule
        </p>
      </div>
    </div>
  );
};

export default TimetableModeStep;
