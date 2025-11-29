import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Homework {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  duration?: number;
  description?: string;
}

interface HomeworkEditStepProps {
  subjects: Array<{ id?: string; name: string; exam_board?: string }>;
}

const HomeworkEditStep = ({ subjects }: HomeworkEditStepProps) => {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    due_date: new Date(),
    duration: "",
    description: "",
  });

  useEffect(() => {
    fetchHomeworks();
  }, []);

  const fetchHomeworks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("homeworks")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setHomeworks(data || []);
    } catch (error) {
      console.error("Error fetching homeworks:", error);
      toast.error("Failed to load homework");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.subject) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const homeworkData = {
        title: formData.title.trim(),
        subject: formData.subject,
        due_date: format(formData.due_date, "yyyy-MM-dd"),
        duration: formData.duration ? parseInt(formData.duration) : null,
        description: formData.description.trim() || null,
        user_id: user.id,
      };

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("homeworks")
          .update(homeworkData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Homework updated!");
      } else {
        // Create new
        const { error } = await supabase
          .from("homeworks")
          .insert(homeworkData);

        if (error) throw error;
        toast.success("Homework added!");
      }

      resetForm();
      fetchHomeworks();
    } catch (error) {
      console.error("Error saving homework:", error);
      toast.error("Failed to save homework");
    }
  };

  const handleEdit = (homework: Homework) => {
    setEditingId(homework.id);
    setFormData({
      title: homework.title,
      subject: homework.subject,
      due_date: new Date(homework.due_date),
      duration: homework.duration?.toString() || "",
      description: homework.description || "",
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("homeworks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Homework deleted!");
      fetchHomeworks();
    } catch (error) {
      console.error("Error deleting homework:", error);
      toast.error("Failed to delete homework");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      subject: "",
      due_date: new Date(),
      duration: "",
      description: "",
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading homework...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Complete Chapter 5 exercises"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <select
                id="subject"
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => date && setFormData({ ...formData, due_date: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="duration">Estimated Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g., 60"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details about the homework..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                {editingId ? "Update Homework" : "Add Homework"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Homework List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">Current Homework ({homeworks.length})</h3>
        {homeworks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No homework added yet. Add your first homework assignment above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {homeworks.map((hw) => (
              <Card key={hw.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{hw.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-primary">{hw.subject}</span>
                        <span>•</span>
                        <span>Due: {format(new Date(hw.due_date), "dd/MM/yyyy")}</span>
                        {hw.duration && (
                          <>
                            <span>•</span>
                            <span>{hw.duration} mins</span>
                          </>
                        )}
                      </div>
                      {hw.description && (
                        <p className="text-sm text-muted-foreground mt-2">{hw.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(hw)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(hw.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeworkEditStep;
