import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, CheckCircle2 } from "lucide-react";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateGroupModal = ({ open, onOpenChange, onSuccess }: CreateGroupModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState(10);
  const [loading, setLoading] = useState(false);
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const joinCode = isPrivate ? generateJoinCode() : null;

      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          name,
          description,
          subject: subject || null,
          is_private: isPrivate,
          join_code: joinCode,
          max_members: maxMembers,
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      if (isPrivate && joinCode) {
        setCreatedJoinCode(joinCode);
        toast.success("Group created successfully!");
      } else {
        toast.success("Group created successfully!");
        onSuccess();
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSubject("");
    setIsPrivate(false);
    setMaxMembers(10);
    setCreatedJoinCode(null);
    setCopied(false);
  };

  const handleCopyCode = async () => {
    if (createdJoinCode) {
      await navigator.clipboard.writeText(createdJoinCode);
      setCopied(true);
      toast.success("Join code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (createdJoinCode) {
      onSuccess();
      resetForm();
      onOpenChange(false);
    } else {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdJoinCode ? "Group Created!" : "Create Study Group"}
          </DialogTitle>
          <DialogDescription>
            {createdJoinCode ? "Share this code with your friends to join the group." : "Start a new study group and invite your friends."}
          </DialogDescription>
        </DialogHeader>

        {createdJoinCode ? (
          <div className="space-y-4">
            <Alert className="bg-primary/10 border-primary">
              <AlertDescription className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Your private group has been created! Share this join code with members:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 bg-background rounded-lg text-2xl font-bold text-center tracking-wider">
                    {createdJoinCode}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopyCode}
                    className="h-12 w-12"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Save this code! Members will need it to join your private group.
                </p>
              </AlertDescription>
            </Alert>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GCSE Maths Study Squad"
            />
          </div>

          <div>
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="private">Private Group</Label>
              <p className="text-xs text-muted-foreground">
                Requires join code to enter
              </p>
            </div>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          <div>
            <Label htmlFor="maxMembers">Max Members</Label>
            <Input
              id="maxMembers"
              type="number"
              min={2}
              max={50}
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Group"}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
