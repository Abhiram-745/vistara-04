import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerConfetti, triggerStars } from "@/utils/celebrations";

interface SessionTimerProps {
  sessionId: string;
  subject: string;
  topic: string;
  plannedDurationMinutes: number;
  onComplete: () => void;
}

export const SessionTimer = ({ sessionId, subject, topic, plannedDurationMinutes, onComplete }: SessionTimerProps) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [focusScore, setFocusScore] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const totalSeconds = plannedDurationMinutes * 60;
  const progress = Math.min((elapsedSeconds / totalSeconds) * 100, 100);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startSession = async () => {
    startTimeRef.current = new Date();
    setStatus('running');
    
    await supabase
      .from('study_sessions')
      .update({
        status: 'in_progress',
        actual_start: startTimeRef.current.toISOString()
      })
      .eq('id', sessionId);

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const pauseSession = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('paused');

    supabase
      .from('study_sessions')
      .update({ status: 'paused' })
      .eq('id', sessionId);
  };

  const resumeSession = () => {
    setStatus('running');
    
    supabase
      .from('study_sessions')
      .update({ status: 'in_progress' })
      .eq('id', sessionId);

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const completeSession = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const endTime = new Date();
    const actualDurationMinutes = Math.floor(elapsedSeconds / 60);

    await supabase
      .from('study_sessions')
      .update({
        status: 'completed',
        actual_end: endTime.toISOString(),
        actual_duration_minutes: actualDurationMinutes,
        notes,
        focus_score: focusScore || null
      })
      .eq('id', sessionId);

    // Trigger celebration based on focus score
    if (focusScore >= 8) {
      triggerConfetti('achievement');
      toast.success("Amazing focus! Session complete!");
    } else if (focusScore >= 5) {
      triggerStars();
      toast.success("Great job! Session complete!");
    } else {
      triggerConfetti('success');
      toast.success("Session complete!");
    }

    onComplete();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-foreground">{subject}</h3>
        {topic && <p className="text-muted-foreground">{topic}</p>}
        
        <div className="text-5xl font-mono font-bold text-primary my-6">
          {formatTime(elapsedSeconds)}
        </div>
        
        <Progress value={progress} className="h-3" />
        <p className="text-sm text-muted-foreground">
          {Math.floor(elapsedSeconds / 60)} / {plannedDurationMinutes} minutes
        </p>
      </div>

      <div className="flex justify-center gap-3">
        {status === 'idle' && (
          <Button onClick={startSession} size="lg" className="gap-2">
            <Play className="w-5 h-5" /> Start Session
          </Button>
        )}
        
        {status === 'running' && (
          <>
            <Button onClick={pauseSession} variant="secondary" size="lg" className="gap-2">
              <Pause className="w-5 h-5" /> Pause
            </Button>
            <Button onClick={completeSession} size="lg" className="gap-2">
              <Square className="w-5 h-5" /> Complete
            </Button>
          </>
        )}
        
        {status === 'paused' && (
          <>
            <Button onClick={resumeSession} size="lg" className="gap-2">
              <Play className="w-5 h-5" /> Resume
            </Button>
            <Button onClick={completeSession} variant="secondary" size="lg" className="gap-2">
              <Square className="w-5 h-5" /> Complete
            </Button>
          </>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Session Notes
          </label>
          <Textarea
            placeholder="What did you learn? Any challenges?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Focus Score (1-10)
          </label>
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button
                key={score}
                onClick={() => setFocusScore(score)}
                className={`p-2 transition-colors ${
                  focusScore >= score ? 'text-yellow-500' : 'text-muted-foreground'
                }`}
              >
                <Star className={`w-5 h-5 ${focusScore >= score ? 'fill-current' : ''}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
