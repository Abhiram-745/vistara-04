import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SessionReflectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  sessionDate: string;
  sessionIndex: number;
  subject: string;
  topic: string;
  duration: number;
  onComplete: () => void;
}

export const SessionReflectionDialog = ({
  open,
  onOpenChange,
  timetableId,
  sessionDate,
  sessionIndex,
  subject,
  topic,
  duration,
  onComplete,
}: SessionReflectionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [howItWent, setHowItWent] = useState("");
  const [focusLevel, setFocusLevel] = useState([70]);
  const [completionStatus, setCompletionStatus] = useState<"yes" | "partially" | "no">("yes");
  const [whatMissed, setWhatMissed] = useState("");
  const [quickNote, setQuickNote] = useState("");

  const saveReflection = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });

      const reflectionData = {
        howItWent,
        focusLevel: focusLevel[0],
        completionStatus,
        whatMissed: (completionStatus === "partially" || completionStatus === "no") ? whatMissed : "",
        quickNote,
        timeOfDay: currentTime,
        duration,
      };

      // Check if reflection already exists
      const { data: existing } = await supabase
        .from("topic_reflections")
        .select("id")
        .eq("user_id", user.id)
        .eq("timetable_id", timetableId)
        .eq("session_date", sessionDate)
        .eq("session_index", sessionIndex)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("topic_reflections")
          .update({ reflection_data: reflectionData as any })
          .eq("id", existing.id);
      } else {
        await supabase.from("topic_reflections").insert({
          user_id: user.id,
          timetable_id: timetableId,
          session_date: sessionDate,
          session_index: sessionIndex,
          subject,
          topic,
          reflection_data: reflectionData as any,
        });
      }

      toast.success("Reflection saved!");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Save reflection error:", error);
      toast.error("Failed to save reflection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session Complete! ✨</DialogTitle>
          <DialogDescription>
            {subject} – {topic} | {duration} mins
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>How did it go?</Label>
            <Textarea
              placeholder="Share your experience with this session..."
              value={howItWent}
              onChange={(e) => setHowItWent(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-3">
            <Label>How focused were you? 🎯</Label>
            <div className="px-2">
              <Slider
                value={focusLevel}
                onValueChange={setFocusLevel}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">Not focused</span>
                <span className="text-lg font-bold text-primary">{focusLevel[0]}%</span>
                <span className="text-xs text-muted-foreground">Super focused</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Did you complete what you planned?</Label>
            <RadioGroup value={completionStatus} onValueChange={(value: any) => setCompletionStatus(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="flex-1 cursor-pointer">✓ Yes</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="partially" id="partially" />
                <Label htmlFor="partially" className="flex-1 cursor-pointer">~ Partially</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="flex-1 cursor-pointer">✗ No, not at all</Label>
              </div>
            </RadioGroup>

            {(completionStatus === "partially" || completionStatus === "no") && (
              <div className="space-y-2 pl-4 pt-2">
                <Label className="text-sm text-muted-foreground">What did you miss?</Label>
                <Textarea
                  placeholder="E.g., didn't finish the last two practice questions..."
                  value={whatMissed}
                  onChange={(e) => setWhatMissed(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Any quick note? (Optional - you can skip)</Label>
            <Textarea
              placeholder="Eg: stuck on integration… rewatch video"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            onComplete();
            onOpenChange(false);
          }}>
            Skip
          </Button>
          <Button onClick={saveReflection} disabled={loading}>
            {loading ? "Saving..." : "Save Reflection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
