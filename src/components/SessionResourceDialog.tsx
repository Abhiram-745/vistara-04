import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Link2, FileText, Trash2, ExternalLink, Edit2, Check, X } from "lucide-react";

interface SessionResource {
  id: string;
  title: string;
  url?: string;
  notes?: string;
  type: string;
  created_at: string;
}

interface SessionResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  sessionId: string;
  sessionDetails: {
    subject: string;
    topic: string;
    date: string;
    time: string;
  };
}

export const SessionResourceDialog = ({
  open,
  onOpenChange,
  timetableId,
  sessionId,
  sessionDetails,
}: SessionResourceDialogProps) => {
  const [resources, setResources] = useState<SessionResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newResource, setNewResource] = useState({
    title: "",
    url: "",
    notes: "",
    type: "link",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    url: "",
    notes: "",
    type: "link",
  });

  useEffect(() => {
    if (open) {
      fetchResources();
    }
  }, [open, sessionId]);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("session_resources")
      .select("*")
      .eq("timetable_id", timetableId)
      .eq("topic", sessionDetails.topic)
      .eq("subject", sessionDetails.subject)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load resources");
    } else {
      setResources(data || []);
    }
    setLoading(false);
  };

  const addResource = async () => {
    if (!newResource.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (newResource.type === "link" && !newResource.url.trim()) {
      toast.error("Please enter a URL for links");
      return;
    }

    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("session_resources").insert({
      user_id: user.id,
      timetable_id: timetableId,
      session_id: sessionId,
      title: newResource.title.trim(),
      url: newResource.url.trim() || null,
      notes: newResource.notes.trim() || null,
      type: newResource.type,
      topic: sessionDetails.topic,
      subject: sessionDetails.subject,
    });

    if (error) {
      toast.error("Failed to add resource");
    } else {
      toast.success("Resource added!");
      setNewResource({ title: "", url: "", notes: "", type: "link" });
      fetchResources();
    }
    setAdding(false);
  };

  const deleteResource = async (resourceId: string) => {
    const { error } = await supabase
      .from("session_resources")
      .delete()
      .eq("id", resourceId);

    if (error) {
      toast.error("Failed to delete resource");
    } else {
      toast.success("Resource deleted");
      fetchResources();
    }
  };

  const startEditing = (resource: SessionResource) => {
    setEditingId(resource.id);
    setEditForm({
      title: resource.title,
      url: resource.url || "",
      notes: resource.notes || "",
      type: resource.type,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ title: "", url: "", notes: "", type: "link" });
  };

  const saveEdit = async (resourceId: string) => {
    if (!editForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (editForm.type === "link" && !editForm.url.trim()) {
      toast.error("Please enter a URL for links");
      return;
    }

    const { error } = await supabase
      .from("session_resources")
      .update({
        title: editForm.title.trim(),
        url: editForm.url.trim() || null,
        notes: editForm.notes.trim() || null,
        type: editForm.type,
      })
      .eq("id", resourceId);

    if (error) {
      toast.error("Failed to update resource");
    } else {
      toast.success("Resource updated!");
      setEditingId(null);
      fetchResources();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session Resources</DialogTitle>
          <DialogDescription>
            {sessionDetails.subject} - {sessionDetails.topic}
            <br />
            {sessionDetails.date} at {sessionDetails.time}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add New Resource */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold text-sm">Add Resource</h3>
            
            <div className="grid gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newResource.type}
                  onValueChange={(value) =>
                    setNewResource({ ...newResource, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newResource.title}
                  onChange={(e) =>
                    setNewResource({ ...newResource, title: e.target.value })
                  }
                  placeholder="e.g. Khan Academy Video"
                  maxLength={200}
                />
              </div>

              {newResource.type === "link" && (
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={newResource.url}
                    onChange={(e) =>
                      setNewResource({ ...newResource, url: e.target.value })
                    }
                    placeholder="https://..."
                    maxLength={500}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newResource.notes}
                  onChange={(e) =>
                    setNewResource({ ...newResource, notes: e.target.value })
                  }
                  placeholder="Add any additional notes..."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <Button onClick={addResource} disabled={adding} className="w-full">
                {adding ? "Adding..." : "Add Resource"}
              </Button>
            </div>
          </div>

          {/* Existing Resources */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">
              Saved Resources ({resources.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading resources...
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No resources added yet
              </div>
            ) : (
              <div className="space-y-2">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    {editingId === resource.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={editForm.type}
                            onValueChange={(value) =>
                              setEditForm({ ...editForm, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="link">Link</SelectItem>
                              <SelectItem value="note">Note</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Title</Label>
                          <Input
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm({ ...editForm, title: e.target.value })
                            }
                            placeholder="e.g. Khan Academy Video"
                            maxLength={200}
                          />
                        </div>

                        {editForm.type === "link" && (
                          <div>
                            <Label>URL</Label>
                            <Input
                              type="url"
                              value={editForm.url}
                              onChange={(e) =>
                                setEditForm({ ...editForm, url: e.target.value })
                              }
                              placeholder="https://..."
                              maxLength={500}
                            />
                          </div>
                        )}

                        <div>
                          <Label>Notes</Label>
                          <Textarea
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm({ ...editForm, notes: e.target.value })
                            }
                            placeholder="Add any additional notes..."
                            rows={3}
                            maxLength={1000}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => saveEdit(resource.id)}
                            size="sm"
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            onClick={cancelEditing}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          {resource.type === "link" ? (
                            <Link2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{resource.title}</h4>
                              {resource.type === "link" && resource.url && (
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            {resource.url && resource.type === "link" && (
                              <p className="text-xs text-muted-foreground break-all mb-2">
                                {resource.url}
                              </p>
                            )}
                            {resource.notes && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {resource.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(resource)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteResource(resource.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
