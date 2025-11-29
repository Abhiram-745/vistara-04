import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, RotateCcw, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TimetableHistoryVersion {
  id: string;
  version_number: number;
  name: string;
  start_date: string;
  end_date: string;
  schedule: any;
  subjects: any;
  test_dates: any;
  topics: any;
  preferences: any;
  change_description: string;
  created_at: string;
}

interface TimetableHistoryDialogProps {
  timetableId: string;
  onRestore: () => void;
}

export const TimetableHistoryDialog = ({
  timetableId,
  onRestore,
}: TimetableHistoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<TimetableHistoryVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<TimetableHistoryVersion | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVersionHistory();
    }
  }, [open, timetableId]);

  const fetchVersionHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("timetable_history")
      .select("*")
      .eq("timetable_id", timetableId)
      .order("version_number", { ascending: false });

    if (error) {
      toast.error("Failed to load timetable history");
      console.error("Error:", error);
    } else {
      setVersions(data || []);
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;

    const { error } = await supabase
      .from("timetables")
      .update({
        name: selectedVersion.name,
        start_date: selectedVersion.start_date,
        end_date: selectedVersion.end_date,
        schedule: selectedVersion.schedule,
        subjects: selectedVersion.subjects,
        test_dates: selectedVersion.test_dates,
        topics: selectedVersion.topics,
        preferences: selectedVersion.preferences,
      })
      .eq("id", timetableId);

    if (error) {
      toast.error("Failed to restore version");
      console.error("Error:", error);
    } else {
      toast.success("Timetable restored to version " + selectedVersion.version_number);
      setShowRestoreConfirm(false);
      setOpen(false);
      onRestore();
    }
  };

  const getTotalSessions = (schedule: any) => {
    if (!schedule) return 0;
    return Object.values(schedule).reduce((total: number, sessions: any) => {
      return total + (sessions?.length || 0);
    }, 0);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" />
            History
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Timetable Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of your timetable. Each version is automatically saved when you make changes.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading history...</div>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No version history available yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  History will be saved automatically as you make changes to your timetable.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version, index) => {
                  const totalSessions = getTotalSessions(version.schedule);
                  const isLatest = index === 0;

                  return (
                    <Card
                      key={version.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isLatest ? "border-primary" : ""
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">
                                Version {version.version_number}
                              </CardTitle>
                              {isLatest && (
                                <Badge variant="default">Current</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(new Date(version.created_at), "dd/MM/yyyy 'at' HH:mm")}
                            </div>
                          </div>
                          {!isLatest && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedVersion(version);
                                setShowRestoreConfirm(true);
                              }}
                              className="gap-2"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-muted-foreground">Name:</span>
                              <p className="font-medium">{version.name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Sessions:</span>
                              <p className="font-medium">{String(totalSessions)}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date Range:</span>
                            <p className="font-medium">
                              {format(new Date(version.start_date), "dd/MM/yyyy")} -{" "}
                              {format(new Date(version.end_date), "dd/MM/yyyy")}
                            </p>
                          </div>
                          {version.change_description && (
                            <div>
                              <span className="text-muted-foreground">Changes:</span>
                              <p className="text-xs">{version.change_description}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore your timetable to Version {selectedVersion?.version_number}. 
              Your current version will be saved to history, so you can always switch back.
              <div className="mt-4 p-3 bg-muted rounded-lg space-y-1 text-sm">
                <p><strong>Name:</strong> {selectedVersion?.name}</p>
                <p><strong>Date Range:</strong> {selectedVersion && format(new Date(selectedVersion.start_date), "dd/MM/yyyy")} - {selectedVersion && format(new Date(selectedVersion.end_date), "dd/MM/yyyy")}</p>
                <p><strong>Sessions:</strong> {selectedVersion && String(getTotalSessions(selectedVersion.schedule))}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
