import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { triggerConfetti, triggerStars } from "@/utils/celebrations";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  xp_reward: number;
}

interface AchievementToastProps {
  achievement: Achievement;
}

export const AchievementToast = ({ achievement }: AchievementToastProps) => {
  const tierColors = {
    bronze: "from-amber-700 to-amber-900",
    silver: "from-slate-400 to-slate-600",
    gold: "from-yellow-400 to-yellow-600",
    platinum: "from-cyan-400 to-blue-600"
  };

  // Trigger celebration when achievement toast appears
  useEffect(() => {
    if (achievement.tier === 'gold' || achievement.tier === 'platinum') {
      triggerConfetti('achievement');
    } else {
      triggerStars();
    }
  }, [achievement.tier]);

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 180 }}
      transition={{ type: "spring", duration: 0.6 }}
    >
      <Card className={`p-6 bg-gradient-to-br ${tierColors[achievement.tier as keyof typeof tierColors]} text-white shadow-2xl border-2 border-white/20`}>
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl"
          >
            {achievement.icon}
          </motion.div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4" />
              <p className="text-sm font-semibold uppercase tracking-wider opacity-90">
                Achievement Unlocked!
              </p>
            </div>
            <h3 className="text-xl font-bold mb-1">{achievement.name}</h3>
            <p className="text-sm opacity-90">{achievement.description}</p>
            <p className="text-sm font-bold mt-2">+{achievement.xp_reward} XP</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
