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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  friend_name: string;
  avatar_url?: string;
}

interface InviteFriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export const InviteFriendsDialog = ({ open, onOpenChange, groupId }: InviteFriendsDialogProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<Set<string>>(new Set());
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open, groupId]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get accepted friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friendships) {
        setFriends([]);
        return;
      }

      // Get friend IDs
      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Get existing group members
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      const memberIds = new Set(members?.map(m => m.user_id) || []);

      // Get existing invitations
      const { data: existingInvitations } = await supabase
        .from("group_invitations")
        .select("invitee_id")
        .eq("group_id", groupId)
        .eq("status", "pending");

      const invitedIds = new Set(existingInvitations?.map(i => i.invitee_id) || []);
      setInvited(invitedIds);

      // Filter friends who are not already members or invited
      const availableFriendIds = friendIds.filter(id => !memberIds.has(id));

      if (availableFriendIds.length === 0) {
        setFriends([]);
        return;
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", availableFriendIds);

      const friendsWithNames = friendships
        .filter(f => {
          const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
          return availableFriendIds.includes(friendId);
        })
        .map(f => {
          const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
          const profile = profiles?.find(p => p.id === friendId);
          return {
            ...f,
            friend_name: profile?.full_name || "Unknown User",
            avatar_url: profile?.avatar_url || undefined,
          };
        });

      setFriends(friendsWithNames);
    } catch (error) {
      console.error("Error loading friends:", error);
      toast.error("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (friendId: string) => {
    try {
      setInviting(prev => new Set(prev).add(friendId));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("group_invitations")
        .insert({
          group_id: groupId,
          inviter_id: user.id,
          invitee_id: friendId,
          status: "pending",
        });

      if (error) throw error;

      setInvited(prev => new Set(prev).add(friendId));
      toast.success("Invitation sent!");
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    } finally {
      setInviting(prev => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Friends to Group
          </DialogTitle>
          <DialogDescription>
            Invite your friends to join this study group
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No friends available to invite</p>
              <p className="text-xs mt-1">All your friends are already members or invited</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map(friend => {
                const friendId = friend.user_id === friend.friend_id ? friend.user_id : friend.friend_id;
                const isInvited = invited.has(friendId);
                const isInviting = inviting.has(friendId);

                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src={friend.avatar_url} />
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {getInitials(friend.friend_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.friend_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isInvited ? "Invitation sent" : "Available"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleInvite(friendId)}
                      disabled={isInviting || isInvited}
                      className={isInvited ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {isInviting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isInvited ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Invited
                        </>
                      ) : (
                        "Invite"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
