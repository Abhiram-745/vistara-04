import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  friend_name: string;
  avatar_url?: string;
  is_incoming: boolean;
}

interface FriendsListProps {
  userId: string;
}

const FriendsList = ({ userId }: FriendsListProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();

    // Set up realtime subscription for friendships
    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        (payload) => {
          // Only reload if this friendship involves the current user
          const friendship = payload.new as any;
          if (friendship?.user_id === userId || friendship?.friend_id === userId) {
            loadFriends();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadFriends = async () => {
    try {
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) throw error;

      // Get friend profiles
      const friendIds = friendships?.map(f => 
        f.user_id === userId ? f.friend_id : f.user_id
      ) || [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", friendIds);

      const friendsWithNames = friendships?.map(f => {
        const friendProfile = profiles?.find(p => p.id === (f.user_id === userId ? f.friend_id : f.user_id));
        return {
          ...f,
          friend_name: friendProfile?.full_name || "Unknown User",
          avatar_url: friendProfile?.avatar_url || undefined,
          is_incoming: f.friend_id === userId && f.status === "pending"
        };
      }) || [];

      setFriends(friendsWithNames);
    } catch (error: any) {
      console.error("Error loading friends:", error);
      toast.error("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;

      toast.success("Friend request accepted!");
      loadFriends();
    } catch (error: any) {
      toast.error("Failed to accept request");
    }
  };

  const handleReject = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      toast.success("Friend request rejected");
      loadFriends();
    } catch (error: any) {
      toast.error("Failed to reject request");
    }
  };

  const getInitials = (name: string) => {
    if (!name || name.trim() === "") return "?";
    return name
      .split(" ")
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = friends.filter(f => f.status === "pending" && f.is_incoming);
  const acceptedFriends = friends.filter(f => f.status === "accepted");
  const sentRequests = friends.filter(f => f.status === "pending" && !f.is_incoming);

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-lg">Friend Requests</CardTitle>
            <CardDescription>Respond to pending friend requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={friend.avatar_url} />
                      <AvatarFallback className="bg-gradient-primary text-white">
                        {getInitials(friend.friend_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{friend.friend_name}</p>
                      <p className="text-xs text-muted-foreground">Pending request</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAccept(friend.id)} className="bg-green-600 hover:bg-green-700">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(friend.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Friends ({acceptedFriends.length})
          </CardTitle>
          <CardDescription>Your study buddies</CardDescription>
        </CardHeader>
        <CardContent>
          {acceptedFriends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No friends yet. Add some friends to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {acceptedFriends.map(friend => (
                <div key={friend.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {getInitials(friend.friend_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{friend.friend_name}</p>
                    <p className="text-xs text-muted-foreground">Friends</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sent Requests</CardTitle>
            <CardDescription>Waiting for response</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sentRequests.map(friend => (
                <div key={friend.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.avatar_url} />
                    <AvatarFallback>{getInitials(friend.friend_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{friend.friend_name}</p>
                    <p className="text-xs text-muted-foreground">Pending...</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FriendsList;
