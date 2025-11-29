import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

interface XPProgressBarProps {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  variant?: 'compact' | 'detailed';
}

export const XPProgressBar = ({ totalXp, level, xpToNextLevel, variant = 'compact' }: XPProgressBarProps) => {
  const currentLevelXp = totalXp % xpToNextLevel;
  const progress = (currentLevelXp / xpToNextLevel) * 100;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Lv {level}</span>
        </div>
        <div className="flex-1">
          <Progress value={progress} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {currentLevelXp}/{xpToNextLevel} XP
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold text-foreground">Level {level}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentLevelXp}/{xpToNextLevel} XP
        </span>
      </div>
      <Progress value={progress} className="h-3" />
      <p className="text-xs text-muted-foreground text-center">
        {xpToNextLevel - currentLevelXp} XP to level {level + 1}
      </p>
    </div>
  );
};
