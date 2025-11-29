import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JoinGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const JoinGroupModal = ({ open, onOpenChange, onSuccess }: JoinGroupModalProps) => {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a join code");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find group by join code
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .single();

      if (groupError || !group) {
        toast.error("Invalid join code");
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        toast.error("You're already a member of this group");
        return;
      }

      // Check member limit
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id);

      if (count && count >= group.max_members) {
        toast.error("This group is full");
        return;
      }

      // Join group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      toast.success(`Joined ${group.name} successfully!`);
      onSuccess();
      onOpenChange(false);
      setJoinCode("");
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error("Failed to join group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Private Group</DialogTitle>
          <DialogDescription>
            Enter the join code shared by the group admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="joinCode">Join Code</Label>
            <Input
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ask the group admin for the join code
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleJoin}
              disabled={loading || joinCode.length !== 6}
              className="flex-1"
            >
              {loading ? "Joining..." : "Join Group"}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
