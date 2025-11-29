import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DashboardSection {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: "progress", label: "Progress Tracking", description: "Study streak, leaderboards, and goals", enabled: true, order: 0 },
  { id: "events", label: "Events & Commitments", description: "Your schedule at a glance", enabled: true, order: 1 },
  { id: "analytics", label: "AI Analytics", description: "Insights and performance analysis", enabled: true, order: 2 },
  { id: "timetables", label: "Timetables", description: "Your study plans", enabled: true, order: 3 },
  { id: "homework", label: "Active Homework", description: "Homework tracker", enabled: true, order: 4 },
];

interface DashboardCustomizerProps {
  onSettingsChange: (sections: DashboardSection[]) => void;
}

const SortableItem = ({ section, onToggle }: { section: DashboardSection; onToggle: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between space-x-4 rounded-lg border p-4 bg-card"
    >
      <div className="flex items-center gap-3 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor={section.id} className="text-base font-medium cursor-pointer">
            {section.label}
          </Label>
          <p className="text-sm text-muted-foreground">
            {section.description}
          </p>
        </div>
      </div>
      <Switch
        id={section.id}
        checked={section.enabled}
        onCheckedChange={() => onToggle(section.id)}
      />
    </div>
  );
};

export const DashboardCustomizer = ({ onSettingsChange }: DashboardCustomizerProps) => {
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Load saved settings from localStorage
    const saved = localStorage.getItem("dashboardSections");
    if (saved) {
      try {
        const savedSections = JSON.parse(saved);
        setSections(savedSections);
        onSettingsChange(savedSections);
      } catch {
        setSections(DEFAULT_SECTIONS);
        onSettingsChange(DEFAULT_SECTIONS);
      }
    } else {
      setSections(DEFAULT_SECTIONS);
      onSettingsChange(DEFAULT_SECTIONS);
    }
  }, []);

  const handleToggle = (id: string) => {
    const updated = sections.map(section =>
      section.id === id ? { ...section, enabled: !section.enabled } : section
    );
    setSections(updated);
    localStorage.setItem("dashboardSections", JSON.stringify(updated));
    onSettingsChange(updated);
    toast.success("Dashboard updated");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index,
        }));
        
        localStorage.setItem("dashboardSections", JSON.stringify(reordered));
        onSettingsChange(reordered);
        toast.success("Dashboard reordered");
        return reordered;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Choose which sections to display on your dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <SortableItem key={section.id} section={section} onToggle={handleToggle} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </DialogContent>
    </Dialog>
  );
};
