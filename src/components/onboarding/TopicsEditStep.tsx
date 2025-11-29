import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, ChevronLeft, ChevronRight, Sparkles, Loader2, Image as ImageIcon, Pencil, Check } from "lucide-react";
import { Subject, Topic } from "../OnboardingWizard";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface TopicsEditStepProps {
  subjects: Subject[];
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;
}

const TopicsEditStep = ({ subjects, topics, setTopics }: TopicsEditStepProps) => {
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [topicName, setTopicName] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const currentSubject = subjects[currentSubjectIndex];
  // Use actual subject ID if available, fall back to index for new subjects without IDs
  const currentSubjectId = currentSubject?.id || currentSubjectIndex.toString();

  const addTopic = () => {
    if (topicName.trim()) {
      setTopics([
        ...topics,
        {
          subject_id: currentSubjectId,
          name: topicName,
        },
      ]);
      setTopicName("");
    }
  };

  const startEditing = (index: number, name: string) => {
    setEditingIndex(index);
    setEditingName(name);
  };

  const saveEdit = (index: number) => {
    if (editingName.trim()) {
      const updatedTopics = [...topics];
      updatedTopics[index] = {
        ...updatedTopics[index],
        name: editingName,
      };
      setTopics(updatedTopics);
      setEditingIndex(null);
      setEditingName("");
      toast.success("Topic updated");
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingName("");
  };

  const goToNextSubject = () => {
    if (currentSubjectIndex < subjects.length - 1) {
      setCurrentSubjectIndex(currentSubjectIndex + 1);
      setTopicName("");
      cancelEdit();
    }
  };

  const goToPreviousSubject = () => {
    if (currentSubjectIndex > 0) {
      setCurrentSubjectIndex(currentSubjectIndex - 1);
      setTopicName("");
      setPastedText("");
      cancelEdit();
    }
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
            setImages(prev => [...prev, base64]);
            toast.success("Image pasted successfully");
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
          setImages(prev => [...prev, base64]);
        };
        reader.readAsDataURL(file);
      }
    });

    toast.success(`${files.length} image(s) uploaded successfully`);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const parseWithAI = async () => {
    if (!pastedText.trim() && images.length === 0) {
      toast.error("Please paste some content or upload images first");
      return;
    }

    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-topics', {
        body: { 
          text: pastedText, 
          subjectName: currentSubject.name,
          images: images.length > 0 ? images : undefined
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.topics && Array.isArray(data.topics)) {
        const newTopics = data.topics.map((t: any) => ({
          subject_id: currentSubjectId,
          name: t.name,
        }));
        setTopics([...topics, ...newTopics]);
        setPastedText("");
        setImages([]);
        toast.success(`Added ${newTopics.length} topics!`);
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error("Failed to parse topics. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const removeTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
    toast.success("Topic removed");
  };

  const currentSubjectTopics = topics.filter(t => t.subject_id === currentSubjectId);

  return (
    <div className="space-y-6">
      {/* Subject Navigation Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Subject {currentSubjectIndex + 1} of {subjects.length}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToPreviousSubject}
              disabled={currentSubjectIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToNextSubject}
              disabled={currentSubjectIndex === subjects.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-primary">{currentSubject.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            View and edit topics for this subject
          </p>
        </div>
      </div>

      {/* Existing Topics List */}
      {currentSubjectTopics.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Label className="mb-3 block">Topics in {currentSubject.name} ({currentSubjectTopics.length})</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {topics.filter(t => t.subject_id === currentSubjectId).map((topic, index) => {
                const originalIndex = topics.indexOf(topic);
                const isEditing = editingIndex === originalIndex;
                
                return (
                  <div
                    key={originalIndex}
                    className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && saveEdit(originalIndex)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => saveEdit(originalIndex)}
                          className="text-primary hover:text-primary"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-medium">{topic.name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(originalIndex, topic.name)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTopic(originalIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Topics Section */}
      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Parse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="topic-name">Add New Topic</Label>
            <Input
              id="topic-name"
              placeholder="e.g., Quadratic Equations"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTopic()}
            />
          </div>

          <Button
            type="button"
            onClick={addTopic}
            disabled={!topicName.trim()}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Topic to {currentSubject.name}
          </Button>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="paste-text">Paste Your Checklist or Notes</Label>
            <Textarea
              id="paste-text"
              placeholder={`Paste your ${currentSubject.name} topics here...\n\nExample:\n- Quadratic equations\n- Pythagoras theorem\n- Circle theorems\n- Trigonometry`}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              onPaste={handlePaste}
              rows={6}
              className="resize-none"
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
              <span className="text-xs text-muted-foreground">or paste images directly (Ctrl+V)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI will automatically extract topics from your checklist
            </p>
          </div>

          {images.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Images ({images.length})</Label>
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-20 object-cover rounded-md border border-border"
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

          <Button
            type="button"
            onClick={parseWithAI}
            disabled={(!pastedText.trim() && images.length === 0) || isParsing}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing Topics...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Parse with AI
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TopicsEditStep;
