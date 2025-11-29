import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Trash2, Clock, Repeat, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  recurrenceRule: z.enum(["none", "daily", "weekly", "monthly"]),
  recurrenceEndDate: z.string().optional(),
}).refine((data) => {
  if (data.recurrenceRule !== "none" && !data.recurrenceEndDate) {
    return false;
  }
  return true;
}, {
  message: "Recurrence end date is required for recurring events",
  path: ["recurrenceEndDate"],
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  recurrence_end_date: string | null;
  parent_event_id: string | null;
}

export const EventsWidget = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .is("parent_event_id", null) // Only fetch parent events, not instances
        .order("start_time", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Set up realtime subscription for events
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateRecurringInstances = (
    startDate: Date,
    endDate: Date,
    rule: string,
    recurrenceEnd: Date
  ): { start: Date; end: Date }[] => {
    const instances: { start: Date; end: Date }[] = [];
    const duration = endDate.getTime() - startDate.getTime();
    let currentStart = new Date(startDate);

    while (currentStart <= recurrenceEnd) {
      instances.push({
        start: new Date(currentStart),
        end: new Date(currentStart.getTime() + duration),
      });

      if (rule === "daily") {
        currentStart = addDays(currentStart, 1);
      } else if (rule === "weekly") {
        currentStart = addWeeks(currentStart, 1);
      } else if (rule === "monthly") {
        currentStart = addMonths(currentStart, 1);
      } else {
        break;
      }
    }

    return instances;
  };

  const regenerateTimetables = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all active timetables that span future dates
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: timetables, error } = await supabase
        .from("timetables")
        .select("*")
        .eq("user_id", user.id)
        .gte("end_date", today)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error || !timetables || timetables.length === 0) {
        console.log("No active timetables to regenerate");
        return;
      }

      toast.info("Regenerating timetables to account for events...", {
        duration: 3000,
      });

      // Regenerate each active timetable
      for (const timetable of timetables) {
        // Fetch all the necessary data
        const { data: preferences } = await supabase
          .from("study_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

      // Fetch all event instances within timetable date range
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .gte("end_time", `${timetable.start_date}T00:00:00`)
        .lte("start_time", `${timetable.end_date}T23:59:59`)
        .order("start_time", { ascending: true });

      // Deduplicate events by unique combination of time and title (not ID)
      const uniqueEvents = Array.from(
        new Map(
          (events || []).map((evt) => [
            `${evt.title}-${evt.start_time}-${evt.end_time}`,
            evt,
          ])
        ).values()
      );

        const { data: homeworks } = await supabase
          .from("homeworks")
          .select("*")
          .eq("user_id", user.id)
          .eq("completed", false)
          .gte("due_date", timetable.start_date)
          .lte("due_date", timetable.end_date);

        // Call the regenerate-tomorrow edge function for each timetable
        await supabase.functions.invoke("regenerate-tomorrow", {
          body: {
            timetableId: timetable.id,
            subjects: timetable.subjects || [],
            topics: timetable.topics || [],
            testDates: timetable.test_dates || [],
            preferences: preferences || timetable.preferences,
            homeworks: homeworks || [],
            events: events || [],
            startDate: timetable.start_date,
            endDate: timetable.end_date,
          },
        });
      }
    } catch (error) {
      console.error("Error regenerating timetables:", error);
    }
  };

  const handleAddEvent = async () => {
    // Validate input
    const validation = eventSchema.safeParse({
      title,
      description,
      startTime,
      endTime,
      recurrenceRule,
      recurrenceEndDate,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const isRecurring = recurrenceRule !== "none";

      // Additional validation for recurring events
      if (isRecurring && recurrenceEndDate) {
        const start = new Date(startTime);
        const recEnd = new Date(recurrenceEndDate);
        
        if (recEnd <= start) {
          toast.error("Recurrence end date must be after the event start date");
          return;
        }

        const instances = generateRecurringInstances(
          start,
          new Date(endTime),
          recurrenceRule,
          recEnd
        );

        if (instances.length > 100) {
          toast.error("Too many recurring instances. Please choose a shorter recurrence period.");
          return;
        }
      }

      // Create parent event
      const { data: parentEvent, error: parentError } = await supabase
        .from("events")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          start_time: startTime,
          end_time: endTime,
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? recurrenceRule : null,
          recurrence_end_date: isRecurring ? recurrenceEndDate : null,
        })
        .select()
        .single();

      if (parentError) throw parentError;

      // Generate recurring instances if applicable
      if (isRecurring && recurrenceEndDate) {
        const instances = generateRecurringInstances(
          new Date(startTime),
          new Date(endTime),
          recurrenceRule,
          new Date(recurrenceEndDate)
        );

        // Skip first instance (it's the parent event itself)
        const recurringInstances = instances.slice(1).map((instance) => ({
          user_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          start_time: instance.start.toISOString(),
          end_time: instance.end.toISOString(),
          is_recurring: false,
          parent_event_id: parentEvent.id,
        }));

        if (recurringInstances.length > 0) {
          const { error: instancesError } = await supabase
            .from("events")
            .insert(recurringInstances);

          if (instancesError) throw instancesError;
        }

        toast.success(`Recurring event created with ${instances.length} instances`);
      } else {
        toast.success("Event added successfully");
      }

      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setRecurrenceRule("none");
      setRecurrenceEndDate("");
      fetchEvents();
      
      // Automatically regenerate timetables to account for the new event
      regenerateTimetables();
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    }
  };

  const handleDeleteEvent = async (id: string, isRecurringParent: boolean) => {
    try {
      if (isRecurringParent) {
        // Delete parent event and all its instances (cascades via foreign key)
        const { error } = await supabase.from("events").delete().eq("id", id);
        if (error) throw error;
        toast.success("Recurring event and all instances deleted");
      } else {
        const { error } = await supabase.from("events").delete().eq("id", id);
        if (error) throw error;
        toast.success("Event deleted");
      }

      fetchEvents();
      
      // Automatically regenerate timetables to account for the removed event
      regenerateTimetables();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleEditClick = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setStartTime(format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"));
    setRecurrenceRule(event.recurrence_rule || "none");
    setRecurrenceEndDate(event.recurrence_end_date ? format(new Date(event.recurrence_end_date), "yyyy-MM-dd") : "");
    setEditDialogOpen(true);
  };

  const handleEditEvent = async () => {
    if (!editingEvent) return;

    // Validate input
    const validation = eventSchema.safeParse({
      title,
      description,
      startTime,
      endTime,
      recurrenceRule,
      recurrenceEndDate,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const isRecurring = recurrenceRule !== "none";

      // For recurring events, validate and regenerate instances
      if (isRecurring && recurrenceEndDate) {
        const start = new Date(startTime);
        const recEnd = new Date(recurrenceEndDate);
        
        if (recEnd <= start) {
          toast.error("Recurrence end date must be after the event start date");
          return;
        }

        const instances = generateRecurringInstances(
          start,
          new Date(endTime),
          recurrenceRule,
          recEnd
        );

        if (instances.length > 100) {
          toast.error("Too many recurring instances. Please choose a shorter recurrence period.");
          return;
        }

        // If this was a recurring parent, delete all old instances
        if (editingEvent.is_recurring) {
          await supabase.from("events").delete().eq("parent_event_id", editingEvent.id);
        }
      }

      // Update the parent event
      const { error: updateError } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          description: description?.trim() || null,
          start_time: startTime,
          end_time: endTime,
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? recurrenceRule : null,
          recurrence_end_date: isRecurring ? recurrenceEndDate : null,
        })
        .eq("id", editingEvent.id);

      if (updateError) throw updateError;

      // Generate new recurring instances if applicable
      if (isRecurring && recurrenceEndDate) {
        const instances = generateRecurringInstances(
          new Date(startTime),
          new Date(endTime),
          recurrenceRule,
          new Date(recurrenceEndDate)
        );

        // Skip first instance (it's the parent event itself)
        const recurringInstances = instances.slice(1).map((instance) => ({
          user_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          start_time: instance.start.toISOString(),
          end_time: instance.end.toISOString(),
          is_recurring: false,
          parent_event_id: editingEvent.id,
        }));

        if (recurringInstances.length > 0) {
          const { error: instancesError } = await supabase
            .from("events")
            .insert(recurringInstances);

          if (instancesError) throw instancesError;
        }

        toast.success(`Event updated with ${instances.length} instances`);
      } else {
        toast.success("Event updated successfully");
      }

      setEditDialogOpen(false);
      setEditingEvent(null);
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setRecurrenceRule("none");
      setRecurrenceEndDate("");
      fetchEvents();
      
      // Automatically regenerate timetables to account for the updated event
      regenerateTimetables();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  // Show all events, sorted by start time
  const displayEvents = events.slice().sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <Card data-tour="events-list">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Events
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-tour="add-event">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Create a new event to block time in your timetable.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Doctor Appointment"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details about this event..."
                />
              </div>
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="recurrence">Repeat</Label>
                <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                  <SelectTrigger id="recurrence">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrenceRule !== "none" && (
                <div>
                  <Label htmlFor="recurrence_end">Repeat Until *</Label>
                  <Input
                    id="recurrence_end"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                </div>
              )}
              <Button onClick={handleAddEvent} className="w-full">
                Add Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading events...</p>
        ) : displayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No events yet. Add events so the AI can schedule around them!
          </p>
        ) : (
          <div className="space-y-3">
            {displayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    {event.is_recurring && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        <Repeat className="h-3 w-3" />
                        {event.recurrence_rule}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(event.start_time), "MMM d, h:mm a")} -{" "}
                      {format(new Date(event.end_time), "h:mm a")}
                    </span>
                    {event.is_recurring && (
                      <span className="text-xs text-muted-foreground">
                        ({Math.round((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60))} min, recurring)
                      </span>
                    )}
                  </div>
                  {event.is_recurring && event.recurrence_end_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Until {format(new Date(event.recurrence_end_date), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(event)}
                    title="Edit event"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEvent(event.id, event.is_recurring)}
                    title={event.is_recurring ? "Delete all instances" : "Delete event"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Modify the details of this event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Event Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Doctor Appointment"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this event..."
              />
            </div>
            <div>
              <Label htmlFor="edit-start-time">Start Time *</Label>
              <Input
                id="edit-start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-end-time">End Time *</Label>
              <Input
                id="edit-end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-recurrence">Repeat</Label>
              <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                <SelectTrigger id="edit-recurrence">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {recurrenceRule !== "none" && (
              <div>
                <Label htmlFor="edit-recurrence-end">Repeat Until *</Label>
                <Input
                  id="edit-recurrence-end"
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                />
              </div>
            )}
            <Button onClick={handleEditEvent} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
