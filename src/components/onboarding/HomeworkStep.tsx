import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Image as ImageIcon, X } from "lucide-react";
import { Subject } from "../OnboardingWizard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Homework {
  id?: string;
  subject: string;
  title: string;
  description?: string;
  due_date: string;
  duration?: number;
  images?: string[];
}

interface HomeworkStepProps {
  subjects: Subject[];
  homeworks: Homework[];
  setHomeworks: (homeworks: Homework[]) => void;
}

const HomeworkStep = ({ subjects, homeworks, setHomeworks }: HomeworkStepProps) => {
  const { toast } = useToast();
  const [currentHomework, setCurrentHomework] = useState<Homework>({
    subject: "",
    title: "",
    description: "",
    due_date: "",
    duration: 60,
    images: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load existing homework from database
  useEffect(() => {
    const loadExistingHomework = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('homeworks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('due_date', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const existingHomeworks = data.map(hw => ({
            id: hw.id,
            subject: hw.subject,
            title: hw.title,
            description: hw.description || "",
            due_date: hw.due_date,
            duration: hw.duration || 60,
            images: [],
          }));
          setHomeworks(existingHomeworks);
        }
      } catch (error) {
        console.error('Error loading homework:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load if homeworks array is empty
    if (homeworks.length === 0) {
      loadExistingHomework();
    } else {
      setIsLoading(false);
    }
  }, []);

  const addHomework = () => {
    if (currentHomework.subject && currentHomework.title && currentHomework.due_date) {
      setHomeworks([...homeworks, { ...currentHomework, id: Date.now().toString() }]);
      setCurrentHomework({
        subject: "",
        title: "",
        description: "",
        due_date: "",
        duration: 60,
        images: [],
      });
    }
  };

  const removeHomework = (id: string) => {
    setHomeworks(homeworks.filter(hw => hw.id !== id));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setCurrentHomework({
              ...currentHomework,
              images: [...(currentHomework.images || []), base64],
            });
            toast({
              title: "Image added",
              description: "Image pasted successfully",
            });
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setCurrentHomework({
            ...currentHomework,
            images: [...(currentHomework.images || []), base64],
          });
        };
        reader.readAsDataURL(file);
      }
    });

    toast({
      title: "Images added",
      description: `${files.length} image(s) uploaded successfully`,
    });
  };

  const removeImage = (index: number) => {
    setCurrentHomework({
      ...currentHomework,
      images: currentHomework.images?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select
            value={currentHomework.subject}
            onValueChange={(value) => setCurrentHomework({ ...currentHomework, subject: value })}
          >
            <SelectTrigger id="subject">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id || subject.name} value={subject.name}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Homework Title</Label>
          <Input
            id="title"
            value={currentHomework.title}
            onChange={(e) => setCurrentHomework({ ...currentHomework, title: e.target.value })}
            placeholder="e.g., Biology Essay on Photosynthesis"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description or Notes (Optional)</Label>
          <Textarea
            id="description"
            value={currentHomework.description}
            onChange={(e) => setCurrentHomework({ ...currentHomework, description: e.target.value })}
            onPaste={handlePaste}
            placeholder="Additional details, paste checklists, or paste images (Ctrl+V)"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
              className="gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Upload Images
            </Button>
            <span className="text-xs text-muted-foreground">or paste images directly into the text area</span>
          </div>
        </div>

        {currentHomework.images && currentHomework.images.length > 0 && (
          <div className="space-y-2">
            <Label>Attached Images ({currentHomework.images.length})</Label>
            <div className="grid grid-cols-3 gap-2">
              {currentHomework.images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`Attachment ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-md border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={currentHomework.due_date}
              onChange={(e) => setCurrentHomework({ ...currentHomework, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Estimated Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={currentHomework.duration}
              onChange={(e) => setCurrentHomework({ ...currentHomework, duration: parseInt(e.target.value) })}
              placeholder="60"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={addHomework}
          disabled={!currentHomework.subject || !currentHomework.title || !currentHomework.due_date}
          className="w-full gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Add Homework
        </Button>
      </div>

      {homeworks.length > 0 && (
        <div className="space-y-2">
          <Label>Added Homework ({homeworks.length})</Label>
          <ScrollArea className="max-h-[200px] sm:max-h-[250px]">
            <div className="space-y-2 pr-4">
              {homeworks.map((hw) => (
                <Card key={hw.id}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{hw.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {hw.subject} • Due: {new Date(hw.due_date).toLocaleDateString()}
                          {hw.duration && ` • ${hw.duration} mins`}
                        </div>
                        {hw.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{hw.description}</div>
                        )}
                        {hw.images && hw.images.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {hw.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Attachment ${idx + 1}`}
                                className="w-10 h-10 object-cover rounded border border-border"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHomework(hw.id!)}
                        className="text-destructive hover:text-destructive flex-shrink-0 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {homeworks.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No homework added yet. Add your homework assignments to include them in your timetable.</p>
          <p className="text-sm mt-2">You can skip this step if you don't have any homework.</p>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading existing homework...</p>
        </div>
      )}
    </div>
  );
};

export default HomeworkStep;
