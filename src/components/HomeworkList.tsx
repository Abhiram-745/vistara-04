import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, Trash2, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Homework {
  id: string;
  subject: string;
  title: string;
  description?: string;
  due_date: string;
  duration?: number;
  completed: boolean;
  created_at: string;
}

interface HomeworkListProps {
  userId: string;
}

export const HomeworkList = ({ userId }: HomeworkListProps) => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [dueTime, setDueTime] = useState<string>("23:59");
  const [duration, setDuration] = useState<string>("");

  const durationOptions = [
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "75", label: "1 hour 15 minutes" },
    { value: "90", label: "1 hour 30 minutes" },
    { value: "105", label: "1 hour 45 minutes" },
    { value: "120", label: "2 hours" },
    { value: "150", label: "Longer task (2+ hours)" },
  ];

  useEffect(() => {
    fetchHomeworks();
  }, [userId]);

  const fetchHomeworks = async () => {
    const { data, error } = await supabase
      .from("homeworks")
      .select("*")
      .eq("user_id", userId)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) {
      toast.error("Failed to load homeworks");
    } else {
      setHomeworks(data as Homework[]);
    }
    setLoading(false);
  };

  const addHomework = async () => {
    if (!subject.trim() || !title.trim() || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Combine date and time into ISO datetime string
    const dueDateTimeStr = `${format(dueDate, "yyyy-MM-dd")}T${dueTime}:00`;

    const { error } = await supabase.from("homeworks").insert({
      user_id: userId,
      subject: subject.trim(),
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDateTimeStr,
      duration: duration ? parseInt(duration) : null,
    });

    if (error) {
      toast.error("Failed to add homework");
    } else {
      toast.success("Homework added!");
      setSubject("");
      setTitle("");
      setDescription("");
      setDueDate(undefined);
      setDueTime("23:59");
      setDuration("");
      setIsDialogOpen(false);
      fetchHomeworks();
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes >= 150) return "2+ hours";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  const toggleComplete = async (id: string, newStatus: boolean) => {
    const { error } = await supabase
      .from("homeworks")
      .update({ completed: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update homework");
    } else {
      toast.success(newStatus ? "Marked as complete!" : "Marked as incomplete");
      fetchHomeworks();
    }
  };

  const deleteHomework = async (id: string) => {
    const { error } = await supabase.from("homeworks").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete homework");
    } else {
      toast.success("Homework deleted");
      fetchHomeworks();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading homeworks...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="active-homework">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Homework Tracker</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" data-tour="add-homework">
                <Plus className="h-4 w-4" />
                Add Homework
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Homework</DialogTitle>
                <DialogDescription>
                  Track your homework assignments and due dates
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Complete Chapter 5 exercises"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional details (optional)"
                    maxLength={500}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Estimated Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium">Due Time *</label>
                  <Input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button onClick={addHomework} className="w-full">
                  Add Homework
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          {homeworks.filter(h => !h.completed).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending homework. Great job! 🎉
            </p>
          ) : (
            <div className="space-y-3">
              {homeworks.filter(h => !h.completed).map((homework) => (
                <div
                  key={homework.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm text-primary">
                          {homework.subject}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Due: {format(new Date(homework.due_date), "dd/MM/yyyy 'at' HH:mm")}
                        </span>
                        {homework.duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(homework.duration)}
                          </span>
                        )}
                      </div>
                      <p className="font-medium">{homework.title}</p>
                      {homework.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {homework.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleComplete(homework.id, true)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteHomework(homework.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
