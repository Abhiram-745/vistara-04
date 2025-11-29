import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Share2, Users } from "lucide-react";

interface ShareTimetableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  timetableName: string;
}

interface UserGroup {
  id: string;
  name: string;
  study_groups: {
    name: string;
  };
}

export const ShareTimetableDialog = ({ open, onOpenChange, timetableId, timetableName }: ShareTimetableDialogProps) => {
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUserGroups();
    }
  }, [open]);

  const loadUserGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from('group_members')
        .select(`
          id,
          group_id,
          study_groups:group_id (
            name
          )
        `)
        .eq('user_id', user.id);

      if (memberships) {
        const groups = memberships
          .filter(m => m.study_groups)
          .map(m => ({
            id: m.group_id,
            name: (m.study_groups as any).name
          }));
        
        setUserGroups(groups as any);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedGroup) {
      toast.error('Please select a group');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already shared
      const { data: existing } = await supabase
        .from('shared_timetables')
        .select('id')
        .eq('timetable_id', timetableId)
        .eq('group_id', selectedGroup)
        .maybeSingle();

      if (existing) {
        toast.error('This timetable is already shared to this group');
        return;
      }

      // Share timetable
      const { error } = await supabase
        .from('shared_timetables')
        .insert({
          timetable_id: timetableId,
          shared_by: user.id,
          group_id: selectedGroup,
          is_public: false
        });

      if (error) throw error;

      toast.success(`"${timetableName}" shared successfully!`);
      onOpenChange(false);
      setSelectedGroup("");
    } catch (error) {
      console.error('Error sharing timetable:', error);
      toast.error('Failed to share timetable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Timetable
          </DialogTitle>
          <DialogDescription>
            Share "{timetableName}" with your study groups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {userGroups.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">You're not in any groups yet</p>
              <p className="text-sm text-muted-foreground">
                Join a study group to share your timetables
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Group
                </label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                Group members will be able to view and implement this timetable with their own preferences.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleShare}
                  disabled={loading || !selectedGroup}
                  className="flex-1"
                >
                  {loading ? "Sharing..." : "Share Timetable"}
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
