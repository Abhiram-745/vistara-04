import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Link as LinkIcon, Upload, Trash2, ExternalLink, Heart, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface GroupResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string;
  uploaded_by: string;
  likes_count: number;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface GroupResourcesProps {
  groupId: string;
}

export const GroupResources = ({ groupId }: GroupResourcesProps) => {
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("link");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadResources();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('group-resources-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_resources',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          loadResources();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadResources = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data: resourcesData, error: resourcesError } = await supabase
        .from('group_resources')
        .select('id, title, description, resource_type, url, uploaded_by, likes_count, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (resourcesError) throw resourcesError;

      if (resourcesData && resourcesData.length > 0) {
        // Fetch profiles
        const userIds = [...new Set(resourcesData.map(r => r.uploaded_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enriched = resourcesData.map(resource => ({
          ...resource,
          profiles: profilesMap.get(resource.uploaded_by) || { full_name: 'Unknown user' },
        })) as GroupResource[];

        setResources(enriched);
      } else {
        setResources([]);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUploadResource = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('group_resources')
        .insert({
          group_id: groupId,
          uploaded_by: user.id,
          title: title.trim(),
          description: description.trim() || null,
          resource_type: resourceType,
          url: url.trim(),
        });

      if (error) throw error;

      toast.success('Resource added successfully');
      setUploadDialogOpen(false);
      resetForm();
      loadResources();
    } catch (error) {
      console.error('Error uploading resource:', error);
      toast.error('Failed to add resource');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!deleteResourceId) return;

    try {
      const { error } = await supabase
        .from('group_resources')
        .delete()
        .eq('id', deleteResourceId);

      if (error) throw error;

      toast.success('Resource deleted successfully');
      setDeleteResourceId(null);
      loadResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  const handleLikeResource = async (resourceId: string, currentLikes: number) => {
    try {
      const { error } = await supabase
        .from('group_resources')
        .update({ likes_count: currentLikes + 1 })
        .eq('id', resourceId);

      if (error) throw error;

      // Optimistically update UI
      setResources(prev =>
        prev.map(r => r.id === resourceId ? { ...r, likes_count: r.likes_count + 1 } : r)
      );
    } catch (error) {
      console.error('Error liking resource:', error);
      toast.error('Failed to like resource');
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setResourceType("link");
    setUrl("");
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return <FileText className="w-5 h-5" />;
      case 'link':
      case 'video':
      default:
        return <LinkIcon className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading resources...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Resources ({resources.length})
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadResources(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., GCSE Maths Formula Sheet"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the resource"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type *</label>
                  <Select value={resourceType} onValueChange={setResourceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL *</label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    resetForm();
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUploadResource} disabled={uploading}>
                  {uploading ? 'Adding...' : 'Add Resource'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {resources.length === 0 ? (
        <Card className="p-12 text-center">
          <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No resources yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to share a helpful resource with the group
          </p>
          <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Add Resource
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      {getResourceIcon(resource.resource_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground mb-1 truncate">
                        {resource.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{resource.profiles.full_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize flex-shrink-0">
                    {resource.resource_type}
                  </Badge>
                </div>

                {resource.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {resource.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLikeResource(resource.id, resource.likes_count)}
                    className="gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    {resource.likes_count}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(resource.url, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </Button>
                    {currentUserId === resource.uploaded_by && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteResourceId(resource.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteResourceId} onOpenChange={(open) => !open && setDeleteResourceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resource? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteResource} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};