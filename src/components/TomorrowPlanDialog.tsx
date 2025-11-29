import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Clock, GripVertical, Search, X, Sparkles, Edit2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { checkCanUseDailyInsights, incrementUsage } from "@/hooks/useUserRole";
import PaywallDialog from "@/components/PaywallDialog";
import { useQueryClient } from "@tanstack/react-query";

interface TomorrowPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  currentDate: string;
  reflection: string;
  incompleteSessions: Array<{
    subject: string;
    topic: string;
    duration: number;
    type: string;
  }>;
  onScheduleUpdate: () => void;
}

interface TopicMetadata {
  confidence: number; // 1-10
  difficulties: string;
}

interface SortableTopicItemProps {
  id: string;
  topicKey: string;
  index: number;
  availableTopics: Array<{ subject: string; topic: string; isDifficult?: boolean }>;
  onRemove?: (topicKey: string) => void;
  onClick?: (topicKey: string) => void;
  metadata?: TopicMetadata;
}

interface ExtendedSortableTopicItemProps extends SortableTopicItemProps {
  onRemove: (topicKey: string) => void;
  onClick: (topicKey: string) => void;
}

const SortableTopicItem = ({ id, topicKey, index, availableTopics, onRemove, onClick, metadata }: ExtendedSortableTopicItemProps) => {
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

  const [subject, topic] = topicKey.split('|||');
  const topicData = availableTopics.find(
    t => t.subject === subject && t.topic === topic
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg group hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => onClick(topicKey)}
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{subject}</p>
            {topicData?.isDifficult && (
              <Badge variant="secondary" className="text-xs shrink-0">Focus Point</Badge>
            )}
            {metadata && (
              <Badge variant="outline" className="text-xs shrink-0">
                Confidence: {metadata.confidence}/10
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{topic}</p>
          {metadata?.difficulties && (
            <p className="text-xs text-muted-foreground italic truncate mt-1">
              "{metadata.difficulties}"
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
          onClick(topicKey);
        }}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(topicKey);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const TomorrowPlanDialog = ({
  open,
  onOpenChange,
  timetableId,
  currentDate,
  reflection,
  incompleteSessions,
  onScheduleUpdate,
}: TomorrowPlanDialogProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<Array<{ subject: string; topic: string; isDifficult?: boolean }>>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState<number | null>(null);
  const [difficultTopics, setDifficultTopics] = useState<Array<{ subject: string; topic: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [topicMetadata, setTopicMetadata] = useState<Record<string, TopicMetadata>>({});
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [tempConfidence, setTempConfidence] = useState(5);
  const [tempDifficulties, setTempDifficulties] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  // Calculate tomorrow's date (or use custom date)
  const getTargetDate = () => {
    if (customDate) return customDate;
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };
  
  const targetDate = getTargetDate();
  const tomorrowDate = targetDate.toISOString().split('T')[0];
  const tomorrowDay = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (open) {
      loadAvailableTopics();
      loadTimingPreferences();
      autoPopulatePriorityTopics();
    }
  }, [open, timetableId, customDate]);

  const autoPopulatePriorityTopics = async () => {
    setLoadingSuggestions(true);
    try {
      // 1. Add incomplete STUDY sessions (not homework)
      const incompleteStudySessions = incompleteSessions
        .filter(session => session.type === 'study')
        .map(session => `${session.subject}|||${session.topic}`);

      // 2. Get AI-suggested topics
      const suggestedTopics = await getSuggestedTopics();

      // 3. Combine and deduplicate
      const autoTopics = [...new Set([...incompleteStudySessions, ...suggestedTopics])];
      
      setSelectedTopics(autoTopics);
    } catch (error) {
      console.error('Error auto-populating topics:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const getSuggestedTopics = async (): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: timetable } = await supabase
        .from('timetables')
        .select('topics, subjects')
        .eq('id', timetableId)
        .single();

      if (!timetable) return [];

      const topics = (timetable.topics as any[]) || [];
      const subjects = (timetable.subjects as any[]) || [];

      // Get difficult/focus topics first
      const difficultTopicKeys = topics
        .filter(t => t.difficulty === 'hard' || t.focus === true)
        .slice(0, 3) // Top 3 difficult topics
        .map(topic => {
          const subject = subjects.find(s => s.id === topic.subject_id);
          return `${subject?.name || 'Unknown'}|||${topic.name}`;
        });

      // Add some random topics if we have less than 5
      const remainingSlots = Math.max(0, 5 - difficultTopicKeys.length);
      const otherTopics = topics
        .filter(t => !(t.difficulty === 'hard' || t.focus === true))
        .sort(() => Math.random() - 0.5)
        .slice(0, remainingSlots)
        .map(topic => {
          const subject = subjects.find(s => s.id === topic.subject_id);
          return `${subject?.name || 'Unknown'}|||${topic.name}`;
        });

      return [...difficultTopicKeys, ...otherTopics];
    } catch (error) {
      console.error('Error getting suggested topics:', error);
      return [];
    }
  };

  const loadTimingPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: preferences } = await supabase
        .from('study_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferences) {
        const dayTimeSlots = preferences.day_time_slots as any[] || [];
        const targetDayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const targetSlot = dayTimeSlots.find((slot: any) => slot.day === targetDayOfWeek);
        
        // Use specific day slot times when available, otherwise fall back to general preferences
        if (targetSlot) {
          setStartTime(targetSlot.startTime || '09:00');
          setEndTime(targetSlot.endTime || '17:00');
        } else {
          setStartTime(preferences.preferred_start_time || '09:00');
          setEndTime(preferences.preferred_end_time || '17:00');
        }

        // Store user's target daily study time (in minutes) for better recommendations
        if (typeof preferences.daily_study_hours === 'number' && !isNaN(preferences.daily_study_hours)) {
          setDailyStudyMinutes(preferences.daily_study_hours * 60);
        }
      }
    } catch (error) {
      console.error('Error loading timing preferences:', error);
    }
  };

  const loadAvailableTopics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: timetable } = await supabase
        .from('timetables')
        .select('topics, subjects')
        .eq('id', timetableId)
        .single();

      if (timetable) {
        const topics = (timetable.topics as any[]) || [];
        const subjects = (timetable.subjects as any[]) || [];
        
        // Extract difficult topics (focus points)
        const difficultTopicsList = topics
          .filter(t => t.difficulty === 'hard' || t.focus === true)
          .map(topic => {
            const subject = subjects.find(s => s.id === topic.subject_id);
            return {
              subject: subject?.name || 'Unknown',
              topic: topic.name
            };
          });
        
        setDifficultTopics(difficultTopicsList);
        
        const topicsWithSubjects = topics.map(topic => {
          const subject = subjects.find(s => s.id === topic.subject_id);
          return {
            subject: subject?.name || 'Unknown',
            topic: topic.name,
            isDifficult: topic.difficulty === 'hard' || topic.focus === true
          };
        });

        setAvailableTopics(topicsWithSubjects);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      toast.error('Failed to load topics');
    }
  };

  const handleTopicToggle = (topicKey: string, openMetadata = false) => {
    setSelectedTopics(prev => {
      const isCurrentlySelected = prev.includes(topicKey);
      
      if (isCurrentlySelected) {
        return prev.filter(t => t !== topicKey);
      } else {
        // Add to end of list when selecting
        if (openMetadata) {
          // Open metadata dialog after a brief delay to ensure state updates
          setTimeout(() => handleTopicClick(topicKey), 100);
        }
        return [...prev, topicKey];
      }
    });
  };

  // Calculate estimated time for topics
  const calculateTopicTime = (confidence: number = 5) => {
    // Lower confidence = more time needed
    // Scale: 10 confidence ≈ 60min, 1 confidence ≈ 90min
    return 60 + (10 - confidence) * 3;
  };

  const getTotalEstimatedTime = () => {
    const topicTime = selectedTopics.reduce((total, key) => {
      const metadata = topicMetadata[key];
      return total + calculateTopicTime(metadata?.confidence);
    }, 0);

    const homeworkTime = incompleteSessions
      .filter(s => s.type === 'homework')
      .reduce((total, s) => total + s.duration, 0);

    const breakTime = Math.max(0, selectedTopics.length - 1) * 15; // 15 min breaks between topics

    return {
      topicTime,
      homeworkTime,
      breakTime,
      total: topicTime + homeworkTime + breakTime
    };
  };

  const getAvailableTime = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return endMinutes - startMinutes;
  };

  const getRecommendations = () => {
    const estimated = getTotalEstimatedTime();
    const availableWindow = getAvailableTime();

    // Target "full day" based on user's preferred daily study hours,
    // but never exceeding the actual available time window
    const targetTotal = dailyStudyMinutes
      ? Math.min(dailyStudyMinutes, availableWindow)
      : availableWindow;

    const remaining = targetTotal - estimated.total;

    // Approximate extra time per topic (study + its share of breaks)
    const avgTopicMinutes = selectedTopics.length > 0
      ? estimated.topicTime / selectedTopics.length
      : 75; // sensible default when nothing selected yet
    const perTopicCost = avgTopicMinutes + 15; // include a break between topics

    if (remaining < -30) {
      const extraHours = Math.ceil(Math.abs(remaining) / 60);
      const topicsToRemove = Math.max(1, Math.ceil(Math.abs(remaining) / perTopicCost));
      return {
        type: 'warning' as const,
        message: `You need ${extraHours} more hour${extraHours > 1 ? 's' : ''} or remove ${topicsToRemove} topic${topicsToRemove > 1 ? 's' : ''}`
      };
    } else if (remaining > 30) {
      const canAdd = Math.max(1, Math.floor(remaining / perTopicCost));
      return {
        type: 'success' as const,
        message: `You can add ${canAdd} more topic${canAdd > 1 ? 's' : ''} for a full day`
      };
    } else {
      return {
        type: 'info' as const,
        message: 'Perfect! You have a well-balanced study day planned'
      };
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleRemoveTopic = (topicKey: string) => {
    setSelectedTopics(prev => prev.filter(t => t !== topicKey));
    setTopicMetadata(prev => {
      const newMetadata = { ...prev };
      delete newMetadata[topicKey];
      return newMetadata;
    });
  };

  const handleTopicClick = (topicKey: string) => {
    setEditingTopic(topicKey);
    const existing = topicMetadata[topicKey];
    setTempConfidence(existing?.confidence || 5);
    setTempDifficulties(existing?.difficulties || "");
  };

  const handleSaveMetadata = () => {
    if (editingTopic) {
      setTopicMetadata(prev => ({
        ...prev,
        [editingTopic]: {
          confidence: tempConfidence,
          difficulties: tempDifficulties
        }
      }));
    }
    setEditingTopic(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSelectedTopics((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleGenerateTomorrow = async () => {
    if (selectedTopics.length === 0 && incompleteSessions.length === 0) {
      toast.error('Please select at least one topic or have incomplete sessions to reschedule');
      return;
    }

    // Check paywall limits first
    const canUse = await checkCanUseDailyInsights();
    if (!canUse) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    try {
      const selectedTopicObjects = selectedTopics.map(key => {
        const [subject, topic] = key.split('|||');
        const metadata = topicMetadata[key];
        return { 
          subject, 
          topic,
          confidence: metadata?.confidence,
          difficulties: metadata?.difficulties
        };
      });

      const { data, error } = await supabase.functions.invoke('regenerate-tomorrow', {
        body: {
          timetableId,
          currentDate: currentDate || new Date().toISOString().split('T')[0],
          tomorrowDate: tomorrowDate,
          reflection,
          selectedTopics: selectedTopicObjects,
          incompleteSessions,
          difficultTopics,
          startTime,
          endTime
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Increment usage after successful generation
      await incrementUsage("daily_insights", queryClient);

      if (data.summary) {
        toast.success(data.summary, { duration: 8000 });
      } else {
        toast.success('Tomorrow\'s schedule generated successfully!');
      }

      onScheduleUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error generating tomorrow:', error);
      toast.error(error.message || 'Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Plan Your Schedule
          </DialogTitle>
          <DialogDescription>
            Customize your schedule for {tomorrowDay}. Select topics to focus on and we'll generate an optimized schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label className="text-sm font-semibold">Schedule Date</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomDate(undefined)}
                className={!customDate ? "border-primary" : ""}
              >
                Tomorrow ({new Date(currentDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})
              </Button>
              <span className="text-muted-foreground text-sm">or</span>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={tomorrowDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    if (!isNaN(newDate.getTime())) {
                      setCustomDate(newDate);
                    }
                  }}
                  className="w-auto"
                />
              </div>
            </div>
          </div>

          {/* Time Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Start Time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End Time
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {/* Time Estimate Summary */}
          {selectedTopics.length > 0 && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Time Estimate</Label>
                <Badge variant="secondary" className="text-sm">
                  {formatMinutes(getTotalEstimatedTime().total)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Study</p>
                  <p className="font-medium">{formatMinutes(getTotalEstimatedTime().topicTime)}</p>
                </div>
                {getTotalEstimatedTime().homeworkTime > 0 && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Homework</p>
                    <p className="font-medium">{formatMinutes(getTotalEstimatedTime().homeworkTime)}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-muted-foreground">Breaks</p>
                  <p className="font-medium">{formatMinutes(getTotalEstimatedTime().breakTime)}</p>
                </div>
              </div>

              {(() => {
                const rec = getRecommendations();
                return (
                  <div className={`p-2 rounded text-xs ${
                    rec.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800' :
                    rec.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-800' :
                    'bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800'
                  }`}>
                    <p className="font-medium">{rec.message}</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Priority Order - Show first */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Priority Order</Label>
              <div className="flex items-center gap-2">
                {loadingSuggestions && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading suggestions...</span>
                  </div>
                )}
                <Badge variant="outline" className="text-xs">Drag to reorder</Badge>
              </div>
            </div>
            
            {selectedTopics.length === 0 ? (
              <div className="border rounded-lg p-8 text-center bg-muted/20">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {loadingSuggestions ? 'Generating personalized suggestions...' : 'No topics selected. Add topics below.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                <div className="flex items-start gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    Higher priority topics get better time slots. Topics include incomplete study sessions and AI suggestions.
                  </p>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedTopics}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedTopics.map((topicKey, index) => (
                        <SortableTopicItem
                          key={topicKey}
                          id={topicKey}
                          topicKey={topicKey}
                          index={index}
                          availableTopics={availableTopics}
                          onRemove={handleRemoveTopic}
                          onClick={handleTopicClick}
                          metadata={topicMetadata[topicKey]}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>

          {/* Topic Selection - For adding more */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Add More Topics</Label>
              <Badge variant="secondary">{selectedTopics.length} in priority list</Badge>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {availableTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No topics available. Topics from your timetable will appear here.
                </p>
              ) : (() => {
                // Filter topics based on search query
                const filteredTopics = availableTopics.filter(topic => 
                  topic.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  topic.topic.toLowerCase().includes(searchQuery.toLowerCase())
                );

                // Group topics by subject
                const topicsBySubject = filteredTopics.reduce((acc, topic) => {
                  if (!acc[topic.subject]) {
                    acc[topic.subject] = [];
                  }
                  acc[topic.subject].push(topic);
                  return acc;
                }, {} as Record<string, typeof availableTopics>);

                const subjects = Object.keys(topicsBySubject).sort();

                if (filteredTopics.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No topics match your search.
                    </p>
                  );
                }

                return (
                  <Accordion type="multiple" className="w-full">
                    {subjects.map((subject) => {
                      const subjectTopics = topicsBySubject[subject];
                      const selectedCount = subjectTopics.filter(t => 
                        selectedTopics.includes(`${t.subject}|||${t.topic}`)
                      ).length;

                      return (
                        <AccordionItem key={subject} value={subject}>
                          <AccordionTrigger className="px-3 hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-2">
                              <span className="font-medium">{subject}</span>
                              <Badge variant="outline" className="text-xs">
                                {selectedCount}/{subjectTopics.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-1 px-3 pb-2">
                              {subjectTopics.map((topic, idx) => {
                                const topicKey = `${topic.subject}|||${topic.topic}`;
                                const isSelected = selectedTopics.includes(topicKey);
                                
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                                    onClick={() => {
                                      if (!isSelected) {
                                        handleTopicToggle(topicKey, true);
                                      } else {
                                        handleTopicClick(topicKey);
                                      }
                                    }}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (!checked) {
                                          handleTopicToggle(topicKey);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm">{topic.topic}</p>
                                        {topic.isDifficult && (
                                          <Badge variant="secondary" className="text-xs shrink-0">Focus Point</Badge>
                                        )}
                                        {isSelected && topicMetadata[topicKey] && (
                                          <Badge variant="outline" className="text-xs shrink-0">
                                            {topicMetadata[topicKey].confidence}/10
                                          </Badge>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          Click to {topicMetadata[topicKey] ? 'edit' : 'add'} details
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                );
              })()}
            </div>
          </div>

          {/* Incomplete Sessions Info */}
          {incompleteSessions.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {incompleteSessions.length} incomplete session(s) from today will be considered for rescheduling based on your reflection.
              </p>
            </div>
          )}

          {/* Time Selection - Always Visible */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label className="text-sm font-medium">Tomorrow's Study Hours</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Start Time
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  End Time
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Schedule will be generated between these hours
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleGenerateTomorrow}
              disabled={loading || (selectedTopics.length === 0 && incompleteSessions.length === 0)}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating Schedule...
                </>
              ) : (
                'Generate Tomorrow\'s Schedule'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            AI will create a balanced schedule considering your selected topics, reflection, events, and time preferences
          </p>
        </div>
      </DialogContent>

      {/* Topic Metadata Dialog */}
      <Dialog open={editingTopic !== null} onOpenChange={(open) => !open && setEditingTopic(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Topic Details</DialogTitle>
            <DialogDescription>
              Help us understand your confidence and any difficulties with this topic
            </DialogDescription>
          </DialogHeader>
          
          {editingTopic && (
            <div className="space-y-6 py-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">
                    {editingTopic.split('|||')[1]}
                  </Label>
                  <Badge variant="outline">{editingTopic.split('|||')[0]}</Badge>
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
                  What might you find difficult?
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
                <Button variant="outline" onClick={() => setEditingTopic(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <PaywallDialog
        open={showPaywall}
        onOpenChange={setShowPaywall}
        limitType="daily_insights"
      />
    </Dialog>
  );
};
