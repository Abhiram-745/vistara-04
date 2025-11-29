import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Stage {
  id: string;
  label: string;
  description: string;
}

interface GenerationProgressProps {
  currentStage: string;
}

const stages: Stage[] = [
  {
    id: "saving",
    label: "Saving Your Data",
    description: "Storing subjects, topics, and preferences",
  },
  {
    id: "analyzing",
    label: "Analyzing Topics",
    description: "Evaluating difficulty and priority",
  },
  {
    id: "scheduling",
    label: "Scheduling Sessions",
    description: "Creating your personalized study plan",
  },
  {
    id: "optimizing",
    label: "Optimizing Schedule",
    description: "Balancing workload across days",
  },
  {
    id: "finalizing",
    label: "Finalizing Timetable",
    description: "Saving your schedule",
  },
];

const GenerationProgress = ({ currentStage }: GenerationProgressProps) => {
  const currentIndex = stages.findIndex((s) => s.id === currentStage);

  return (
    <div className="space-y-4 p-6 bg-gradient-to-br from-background via-muted/30 to-background rounded-xl border border-border/50 shadow-elegant">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="h-8 w-8 text-primary animate-spin relative" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Generating Your Timetable</h3>
          <p className="text-sm text-muted-foreground">This may take a moment...</p>
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-start gap-3 p-3 rounded-lg transition-all
                ${isCurrent ? "bg-primary/10 border border-primary/20" : ""}
                ${isCompleted ? "opacity-75" : ""}
                ${isPending ? "opacity-50" : ""}
              `}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : isCurrent ? (
                  <div className="relative">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${isCurrent ? "text-primary" : ""}`}>
                  {stage.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stage.description}
                </p>
              </div>

              {isCurrent && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/0"
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {currentIndex + 1} of {stages.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / stages.length) * 100)}% complete</span>
        </div>
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / stages.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default GenerationProgress;
