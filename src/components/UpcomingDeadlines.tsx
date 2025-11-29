import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, Check, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

interface Deadline {
  id: string;
  type: "test" | "homework";
  subject: string;
  title: string;
  date: string;
  testType?: string;
  description?: string;
}

interface UpcomingDeadlinesProps {
  userId: string;
}

export const UpcomingDeadlines = ({ userId }: UpcomingDeadlinesProps) => {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchDeadlines();
  }, [userId]);

  const fetchDeadlines = async () => {
    const today = format(new Date(), "yyyy-MM-dd");

    // Fetch test dates
    const { data: tests, error: testsError } = await supabase
      .from("test_dates")
      .select("*, subjects(name)")
      .gte("test_date", today)
      .order("test_date", { ascending: true });

    // Fetch homework
    const { data: homework, error: homeworkError } = await supabase
      .from("homeworks")
      .select("*")
      .eq("user_id", userId)
      .eq("completed", false)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(5);

    if (testsError || homeworkError) {
      console.error("Error fetching deadlines:", testsError || homeworkError);
      setLoading(false);
      return;
    }

    // Remove duplicate test dates (same subject + date)
    const uniqueTests = new Map();
    (tests || []).forEach((test: any) => {
      const key = `${test.subjects?.name}-${test.test_date}`;
      if (!uniqueTests.has(key)) {
        uniqueTests.set(key, test);
      }
    });

    // Combine and format deadlines
    const formattedTests: Deadline[] = Array.from(uniqueTests.values())
      .map((test: any) => ({
        id: test.id,
        type: "test" as const,
        subject: test.subjects?.name || "Unknown",
        title: test.test_type || "Test",
        date: test.test_date,
        testType: test.test_type,
      }))
      .slice(0, 5);

    const formattedHomework: Deadline[] = (homework || []).map((hw: any) => ({
      id: hw.id,
      type: "homework" as const,
      subject: hw.subject,
      title: hw.title,
      date: hw.due_date,
      description: hw.description,
    }));

    // Combine and sort by date
    const allDeadlines = [...formattedTests, ...formattedHomework]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    setDeadlines(allDeadlines);
    setLoading(false);
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString + 'T00:00:00');
    const days = differenceInDays(targetDate, today);
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  const getUrgencyColor = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString + 'T00:00:00');
    const days = differenceInDays(targetDate, today);
    if (days <= 1) return "deadline-urgent";
    if (days <= 3) return "deadline-soon";
    return "deadline-normal";
  };

  const getUrgencyLabel = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString + 'T00:00:00');
    const days = differenceInDays(targetDate, today);
    if (days === 0) return "🔴 Due Today";
    if (days === 1) return "🟠 Due Tomorrow";
    if (days <= 3) return "🟡 Due Soon";
    return getDaysUntil(dateString);
  };

  const handleDeadlineClick = async (deadline: Deadline) => {
    // If it's homework and we don't have description yet, fetch it
    if (deadline.type === "homework" && !deadline.description) {
      const { data } = await supabase
        .from("homeworks")
        .select("description")
        .eq("id", deadline.id)
        .single();
      
      if (data) {
        deadline.description = data.description;
      }
    }
    setSelectedDeadline(deadline);
    setDialogOpen(true);
  };

  const handleToggleComplete = async (deadline: Deadline, completed: boolean) => {
    if (deadline.type !== "homework") return;

    const { error } = await supabase
      .from("homeworks")
      .update({ completed })
      .eq("id", deadline.id);

    if (error) {
      toast.error("Failed to update homework");
      return;
    }

    toast.success(completed ? "Homework marked as complete" : "Homework marked as incomplete");
    setDialogOpen(false);
    fetchDeadlines();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading deadlines...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deadlines.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No upcoming deadlines. You're all caught up! 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {deadlines.map((deadline) => (
                <div
                  key={`${deadline.type}-${deadline.id}`}
                  onClick={() => handleDeadlineClick(deadline)}
                  className="group relative flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mt-1 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {deadline.type === "test" ? (
                      <BookOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <Clock className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="font-semibold line-clamp-2 overflow-hidden group-hover:text-primary transition-colors">
                              {deadline.title}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{deadline.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        {deadline.subject}
                      </p>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getUrgencyColor(deadline.date)}`}>
                          {getUrgencyLabel(deadline.date)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {deadline.type === "homework" 
                            ? format(new Date(deadline.date), "dd MMM 'at' HH:mm")
                            : format(new Date(deadline.date), "dd MMM")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDeadline?.type === "test" ? (
                <BookOpen className="h-5 w-5 text-primary" />
              ) : (
                <Clock className="h-5 w-5 text-primary" />
              )}
              {selectedDeadline?.title}
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Subject:</span>
                  <span className="text-sm text-muted-foreground">{selectedDeadline?.subject}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Due Date:</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedDeadline && (
                      selectedDeadline.type === "homework"
                        ? format(new Date(selectedDeadline.date), "MMMM dd, yyyy 'at' HH:mm")
                        : format(new Date(selectedDeadline.date), "MMMM dd, yyyy")
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Time Until:</span>
                  <span className={`text-sm font-medium ${selectedDeadline ? getUrgencyColor(selectedDeadline.date) : ''} px-3 py-1 rounded-full border`}>
                    {selectedDeadline && getUrgencyLabel(selectedDeadline.date)}
                  </span>
                </div>
                
                {selectedDeadline?.type === "homework" && selectedDeadline?.description && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Description:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedDeadline.description}
                    </p>
                  </div>
                )}
                
                {selectedDeadline?.type === "test" && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      This is a {selectedDeadline.testType || "test"} for {selectedDeadline.subject}.
                    </p>
                  </div>
                )}

                {selectedDeadline?.type === "homework" && (
                  <div className="pt-3 border-t">
                    <Button
                      onClick={() => selectedDeadline && handleToggleComplete(selectedDeadline, true)}
                      className="w-full"
                      variant="default"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </Button>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
