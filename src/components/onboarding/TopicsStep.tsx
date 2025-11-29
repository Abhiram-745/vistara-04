import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, ChevronLeft, ChevronRight, Sparkles, Loader2, Image as ImageIcon, Search, GripVertical, Edit2 } from "lucide-react";
import { Subject, Topic } from "../OnboardingWizard";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface TopicsStepProps {
  subjects: Subject[];
  topics: Topic[];
  setTopics: (topics: Topic[]) => void;
}

interface SortableTopicItemProps {
  id: string;
  topic: Topic;
  index: number;
  onRemove: () => void;
  onClick: () => void;
  subjectName: string;
}

const SortableTopicItem = ({ id, topic, index, onRemove, onClick, subjectName }: SortableTopicItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Badge variant="outline" className="text-xs shrink-0">
          #{index + 1}
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{topic.name}</p>
          <p className="text-xs text-muted-foreground truncate">{subjectName}</p>
          {topic.confidence !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs shrink-0">
                Confidence: {topic.confidence}/10
              </Badge>
            </div>
          )}
          {topic.difficulties && (
            <p className="text-xs text-muted-foreground italic truncate mt-1">
              "{topic.difficulties}"
            </p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-destructive hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const TopicsStep = ({ subjects, topics, setTopics }: TopicsStepProps) => {
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [topicName, setTopicName] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPriorityOrder, setShowPriorityOrder] = useState(false);
  const [editingTopicIndex, setEditingTopicIndex] = useState<number | null>(null);
  const [tempConfidence, setTempConfidence] = useState(5);
  const [tempDifficulties, setTempDifficulties] = useState("");

  const currentSubject = subjects[currentSubjectIndex];
  // Use actual subject ID if available, fall back to index for backward compatibility
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

  const goToNextSubject = () => {
    if (currentSubjectIndex < subjects.length - 1) {
      setCurrentSubjectIndex(currentSubjectIndex + 1);
      setTopicName("");
    }
  };

  const goToPreviousSubject = () => {
    if (currentSubjectIndex > 0) {
      setCurrentSubjectIndex(currentSubjectIndex - 1);
      setTopicName("");
      setPastedText("");
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
        setAdditionalNotes("");
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
  };

  const handleTopicClick = (index: number) => {
    setEditingTopicIndex(index);
    const topic = topics[index];
    setTempConfidence(topic.confidence || 5);
    setTempDifficulties(topic.difficulties || "");
  };

  const handleSaveMetadata = () => {
    if (editingTopicIndex !== null) {
      const updatedTopics = [...topics];
      updatedTopics[editingTopicIndex] = {
        ...updatedTopics[editingTopicIndex],
        confidence: tempConfidence,
        difficulties: tempDifficulties
      };
      setTopics(updatedTopics);
    }
    setEditingTopicIndex(null);
  };

  const getSubjectName = (subjectId: string) => {
    // Try to find by UUID first
    const subjectByUUID = subjects.find(s => s.id === subjectId);
    if (subjectByUUID) return subjectByUUID.name;
    // Fall back to index-based lookup for old data
    const subject = subjects.find((s, i) => i.toString() === subjectId);
    return subject?.name || "";
  };

  const currentSubjectTopics = topics.filter(t => t.subject_id === currentSubjectId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = topics.findIndex(t => `${t.subject_id}-${t.name}` === active.id);
      const newIndex = topics.findIndex(t => `${t.subject_id}-${t.name}` === over.id);
      const newTopics = arrayMove(topics, oldIndex, newIndex);
      setTopics(newTopics);
    }
  };

  const filteredTopics = topics.filter(topic => {
    const subjectName = getSubjectName(topic.subject_id);
    return (
      topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subjectName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const topicsBySubject = filteredTopics.reduce((acc, topic) => {
    if (!acc[topic.subject_id]) {
      acc[topic.subject_id] = [];
    }
    acc[topic.subject_id].push(topic);
    return acc;
  }, {} as Record<string, Topic[]>);

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
            Add topics you're studying in this subject
          </p>
        </div>
      </div>

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
          <Label htmlFor="topic-name">Topic Name</Label>
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

      {topics.length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-semibold">All Topics</Label>
              <p className="text-xs text-muted-foreground">
                {topics.length} topic{topics.length !== 1 ? 's' : ''} across {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPriorityOrder(!showPriorityOrder)}
            >
              {showPriorityOrder ? "Hide" : "Show"} Priority Order
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {!showPriorityOrder ? (
            /* Grouped by Subject View */
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {filteredTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No topics match your search.
                </p>
              ) : (
                <Accordion type="multiple" className="w-full" defaultValue={Object.keys(topicsBySubject)}>
                  {Object.entries(topicsBySubject).map(([subjectId, subjectTopics]) => {
                    const subjectName = getSubjectName(subjectId);
                    return (
                      <AccordionItem key={subjectId} value={subjectId}>
                        <AccordionTrigger className="px-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <span className="font-medium">{subjectName}</span>
                            <Badge variant="outline" className="text-xs">
                              {subjectTopics.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 px-3 pb-2">
                            {subjectTopics.map((topic) => {
                              const originalIndex = topics.indexOf(topic);
                              return (
                                <div
                                  key={originalIndex}
                                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <p className="text-sm flex-1">{topic.name}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTopic(originalIndex)}
                                    className="text-destructive hover:text-destructive shrink-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          ) : (
            /* Priority Order View with Drag and Drop */
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs text-muted-foreground">
                  💡 Drag topics to set priority order. Higher priority topics will get more study time in your timetable.
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto border rounded-lg p-3 bg-muted/20">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredTopics.map(t => `${t.subject_id}-${t.name}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {filteredTopics.map((topic, index) => {
                        const originalIndex = topics.indexOf(topic);
                        const topicId = `${topic.subject_id}-${topic.name}`;
                        return (
                          <SortableTopicItem
                            key={topicId}
                            id={topicId}
                            topic={topic}
                            index={topics.indexOf(topic)}
                            onRemove={() => removeTopic(originalIndex)}
                            onClick={() => handleTopicClick(originalIndex)}
                            subjectName={getSubjectName(topic.subject_id)}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Topic Metadata Dialog */}
      <Dialog open={editingTopicIndex !== null} onOpenChange={(open) => !open && setEditingTopicIndex(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Topic Details</DialogTitle>
            <DialogDescription>
              Help us understand your confidence and any difficulties with this topic
            </DialogDescription>
          </DialogHeader>
          
          {editingTopicIndex !== null && (
            <div className="space-y-6 py-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">
                    {topics[editingTopicIndex].name}
                  </Label>
                  <Badge variant="outline">
                    {getSubjectName(topics[editingTopicIndex].subject_id)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="confidence" className="text-sm font-medium">
                    Confidence Level
                  </Label>
                  <Badge variant="secondary" className="text-sm">
                    {tempConfidence}/10
                  </Badge>
                </div>
                <Slider
                  id="confidence"
                  min={1}
                  max={10}
                  step={1}
                  value={[tempConfidence]}
                  onValueChange={(value) => setTempConfidence(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Not confident</span>
                  <span>Very confident</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulties" className="text-sm font-medium">
                  What might you find difficult? (Optional)
                </Label>
                <Textarea
                  id="difficulties"
                  placeholder="e.g., Complex formulas, specific concepts, timing..."
                  value={tempDifficulties}
                  onChange={(e) => setTempDifficulties(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This helps AI allocate appropriate time and suggest resources
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveMetadata} className="flex-1">
                  Save Details
                </Button>
                <Button variant="outline" onClick={() => setEditingTopicIndex(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopicsStep;
