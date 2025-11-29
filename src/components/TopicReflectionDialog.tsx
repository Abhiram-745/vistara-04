import { useState, useRef } from "react";
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
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface TopicReflectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  sessionDate: string;
  sessionIndex: number;
  subject: string;
  topic: string;
}

interface ReflectionContent {
  type: "text" | "image";
  content: string;
  id: string;
}

interface ReflectionData {
  easyAspects: ReflectionContent[];
  hardAspects: ReflectionContent[];
  generalNotes: ReflectionContent[];
  overallFeeling: string;
  difficultyRating: number; // 1-10 scale: 1=very easy, 10=very hard
  sessionCompleted: boolean; // Did user finish the session?
  timeOfDay: string; // When the session happened (for peak hours analysis)
}

export const TopicReflectionDialog = ({
  open,
  onOpenChange,
  timetableId,
  sessionDate,
  sessionIndex,
  subject,
  topic,
}: TopicReflectionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [easyAspects, setEasyAspects] = useState<ReflectionContent[]>([]);
  const [hardAspects, setHardAspects] = useState<ReflectionContent[]>([]);
  const [generalNotes, setGeneralNotes] = useState<ReflectionContent[]>([]);
  const [overallFeeling, setOverallFeeling] = useState("");
  const [difficultyRating, setDifficultyRating] = useState(5);
  const [sessionCompleted, setSessionCompleted] = useState(true);
  
  const easyFileRef = useRef<HTMLInputElement>(null);
  const hardFileRef = useRef<HTMLInputElement>(null);
  const notesFileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (
    file: File,
    section: "easy" | "hard" | "notes"
  ) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `reflections/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("study-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("study-images")
        .getPublicUrl(filePath);

      const newImage: ReflectionContent = {
        type: "image",
        content: publicUrl,
        id: crypto.randomUUID(),
      };

      if (section === "easy") {
        setEasyAspects([...easyAspects, newImage]);
      } else if (section === "hard") {
        setHardAspects([...hardAspects, newImage]);
      } else {
        setGeneralNotes([...generalNotes, newImage]);
      }

      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
    }
  };

  const addText = (section: "easy" | "hard" | "notes", text: string) => {
    if (!text.trim()) return;

    const newText: ReflectionContent = {
      type: "text",
      content: text,
      id: crypto.randomUUID(),
    };

    if (section === "easy") {
      setEasyAspects([...easyAspects, newText]);
    } else if (section === "hard") {
      setHardAspects([...hardAspects, newText]);
    } else {
      setGeneralNotes([...generalNotes, newText]);
    }
  };

  const removeContent = (section: "easy" | "hard" | "notes", id: string) => {
    if (section === "easy") {
      setEasyAspects(easyAspects.filter((item) => item.id !== id));
    } else if (section === "hard") {
      setHardAspects(hardAspects.filter((item) => item.id !== id));
    } else {
      setGeneralNotes(generalNotes.filter((item) => item.id !== id));
    }
  };

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
        easyAspects,
        hardAspects,
        generalNotes,
        overallFeeling,
        difficultyRating,
        sessionCompleted,
        timeOfDay: currentTime,
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
      onOpenChange(false);
    } catch (error) {
      console.error("Save reflection error:", error);
      toast.error("Failed to save reflection");
    } finally {
      setLoading(false);
    }
  };

  const ContentSection = ({
    title,
    items,
    section,
    fileRef,
    placeholder,
  }: {
    title: string;
    items: ReflectionContent[];
    section: "easy" | "hard" | "notes";
    fileRef: React.RefObject<HTMLInputElement>;
    placeholder: string;
  }) => {
    const [textInput, setTextInput] = useState("");

    return (
      <div className="space-y-2">
        <Label>{title}</Label>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              {item.type === "text" ? (
                <div className="p-3 bg-muted rounded-lg relative">
                  <p className="text-sm pr-8">{item.content}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => removeContent(section, item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={item.content}
                    alt="Reflection"
                    className="rounded-lg max-h-48 w-auto"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => removeContent(section, item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              placeholder={placeholder}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addText(section, textInput);
                  setTextInput("");
                }
              }}
              className="flex-1 min-h-[60px]"
            />
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  addText(section, textInput);
                  setTextInput("");
                }}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, section);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reflection: {topic}</DialogTitle>
          <DialogDescription>
            {subject} - How did this study session go?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <ContentSection
            title="What did you find easy? 🌟"
            items={easyAspects}
            section="easy"
            fileRef={easyFileRef}
            placeholder="E.g., The examples were clear..."
          />

          <ContentSection
            title="What was challenging? 💪"
            items={hardAspects}
            section="hard"
            fileRef={hardFileRef}
            placeholder="E.g., I struggled with the proofs..."
          />

          <ContentSection
            title="General notes and observations 📝"
            items={generalNotes}
            section="notes"
            fileRef={notesFileRef}
            placeholder="Any other thoughts or notes..."
          />

          <div className="space-y-2">
            <Label>Overall, how do you feel about this topic?</Label>
            <Textarea
              placeholder="Confident, need more practice, ready to move on..."
              value={overallFeeling}
              onChange={(e) => setOverallFeeling(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label>How difficult was this topic? 🎯</Label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground min-w-[80px]">Very Easy</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={difficultyRating}
                  onChange={(e) => setDifficultyRating(Number(e.target.value))}
                  className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <span className="text-sm text-muted-foreground min-w-[80px] text-right">Very Hard</span>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">{difficultyRating}</span>
                <span className="text-sm text-muted-foreground ml-2">/ 10</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Did you complete the full session? ⏱️</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={sessionCompleted ? "default" : "outline"}
                  onClick={() => setSessionCompleted(true)}
                  className="flex-1"
                >
                  ✓ Yes, completed
                </Button>
                <Button
                  type="button"
                  variant={!sessionCompleted ? "default" : "outline"}
                  onClick={() => setSessionCompleted(false)}
                  className="flex-1"
                >
                  ✗ Couldn't finish
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
