import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Clock, BookOpen, TrendingUp, Calendar } from "lucide-react";
import Header from "@/components/Header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import PageTransition from "@/components/PageTransition";

interface Reflection {
  id: string;
  subject: string;
  topic: string;
  session_date: string;
  reflection_data: {
    howItWent?: string;
    focusLevel?: number;
    completionStatus?: "yes" | "partially" | "no";
    whatMissed?: string;
    quickNote?: string;
    timeOfDay?: string;
    duration?: number;
  };
  created_at: string;
}

const Reflections = () => {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);

  useEffect(() => {
    fetchReflections();
  }, []);

  const fetchReflections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("topic_reflections")
        .select("*")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false });

      if (error) throw error;
      setReflections((data as any) || []);
    } catch (error) {
      console.error("Error fetching reflections:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionColor = (status?: string) => {
    switch (status) {
      case "yes": return "bg-green-500/10 text-green-700 border-green-200";
      case "partially": return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "no": return "bg-red-500/10 text-red-700 border-red-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCompletionText = (status?: string) => {
    switch (status) {
      case "yes": return "Completed";
      case "partially": return "Partially";
      case "no": return "Not completed";
      default: return "Unknown";
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">Loading reflections...</div>
        </div>
      </>
    );
  }

  return (
    <PageTransition>
      <Header />
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Study Reflections</h1>
          <p className="text-muted-foreground">
            Your study session insights and progress over time
          </p>
        </div>

        {reflections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reflections yet</h3>
              <p className="text-muted-foreground">
                Complete study sessions and add reflections to see them here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reflections.map((reflection) => (
              <Card
                key={reflection.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedReflection(reflection)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate">
                        {reflection.subject} – {reflection.topic}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{reflection.reflection_data.duration || 0} mins</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(reflection.session_date), "d MMM")}</span>
                      </div>
                    </div>
                    <Badge className={getCompletionColor(reflection.reflection_data.completionStatus)}>
                      {getCompletionText(reflection.reflection_data.completionStatus)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Focus Level</span>
                      <span className="font-semibold">{reflection.reflection_data.focusLevel || 0}%</span>
                    </div>
                    <Progress value={reflection.reflection_data.focusLevel || 0} className="h-2" />
                  </div>
                  
                  {reflection.reflection_data.quickNote && (
                    <div className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">
                      "{reflection.reflection_data.quickNote}"
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedReflection} onOpenChange={() => setSelectedReflection(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedReflection?.subject} – {selectedReflection?.topic}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {selectedReflection?.reflection_data.duration || 0} mins
                <span>•</span>
                {selectedReflection?.session_date && format(new Date(selectedReflection.session_date), "PPP")}
                {selectedReflection?.reflection_data.timeOfDay && (
                  <>
                    <span>•</span>
                    {selectedReflection.reflection_data.timeOfDay}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completion Status</p>
                  <Badge className={getCompletionColor(selectedReflection?.reflection_data.completionStatus)}>
                    {getCompletionText(selectedReflection?.reflection_data.completionStatus)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Focus Level</p>
                  <p className="text-2xl font-bold text-primary">{selectedReflection?.reflection_data.focusLevel || 0}%</p>
                </div>
              </div>

              {selectedReflection?.reflection_data.howItWent && (
                <div>
                  <h4 className="font-semibold mb-2">How it went</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedReflection.reflection_data.howItWent}
                  </p>
                </div>
              )}

              {selectedReflection?.reflection_data.whatMissed && (
                <div>
                  <h4 className="font-semibold mb-2">What was missed</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedReflection.reflection_data.whatMissed}
                  </p>
                </div>
              )}

              {selectedReflection?.reflection_data.quickNote && (
                <div>
                  <h4 className="font-semibold mb-2">Quick Note</h4>
                  <p className="text-sm italic text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    "{selectedReflection.reflection_data.quickNote}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setSelectedReflection(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default Reflections;
