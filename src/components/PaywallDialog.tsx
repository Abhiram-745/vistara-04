import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Zap, TrendingUp, Calendar, Sparkles } from "lucide-react";

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: "timetable_creation" | "timetable_regeneration" | "daily_insights" | "ai_insights";
}

const PaywallDialog = ({ open, onOpenChange, limitType }: PaywallDialogProps) => {
  const getLimitMessage = () => {
    switch (limitType) {
      case "timetable_creation":
        return {
          title: "Free Timetable Limit Reached",
          description: "You've used your free timetable creation. Upgrade to create unlimited timetables!",
          icon: <Calendar className="h-12 w-12 text-primary" />,
        };
      case "timetable_regeneration":
        return {
          title: "Free Regeneration Used",
          description: "You've used your free timetable regeneration. Upgrade for unlimited regenerations!",
          icon: <Zap className="h-12 w-12 text-primary" />,
        };
      case "daily_insights":
        return {
          title: "Daily Insights Limit Reached",
          description: "You've used today's free insights update. It resets tomorrow, or upgrade for unlimited access!",
          icon: <TrendingUp className="h-12 w-12 text-primary" />,
        };
      case "ai_insights":
        return {
          title: "AI Insights Limit Reached",
          description: "You've used your free AI insights generation. Upgrade for unlimited AI-powered analysis!",
          icon: <Sparkles className="h-12 w-12 text-primary" />,
        };
    }
  };

  const limit = getLimitMessage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {limit.icon}
          </div>
          <DialogTitle className="text-center text-2xl">{limit.title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {limit.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Free Plan Limits:
            </h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• 1 timetable creation</li>
              <li>• 1 timetable regeneration</li>
              <li>• 1 daily insights update per day</li>
              <li>• 1 AI insights analysis</li>
            </ul>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg space-y-3 border border-primary/20">
            <h4 className="font-semibold flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              Upgrade to unlock:
            </h4>
            <ul className="text-sm space-y-2">
              <li>✅ Unlimited timetable creation</li>
              <li>✅ Unlimited regenerations</li>
              <li>✅ Unlimited daily insights</li>
              <li>✅ Unlimited AI analysis</li>
              <li>✅ Priority support</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                window.open("mailto:support@example.com?subject=Upgrade%20to%20Premium", "_blank");
              }}
              className="flex-1 gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade for £5/month
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallDialog;
