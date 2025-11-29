import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Users, MessageSquare, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  requester_name: string;
  requester_avatar?: string;
}

interface GroupActivity {
  id: string;
  group_name: string;
  message: string;
  created_at: string;
}

interface RecentActivityWidgetProps {
  userId: string;
}

export const RecentActivityWidget = ({ userId }: RecentActivityWidgetProps) => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [groupActivities, setGroupActivities] = useState<GroupActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    loadRecentActivity();
  }, [userId]);

  const loadRecentActivity = async () => {
    try {
      // Get pending friend requests
      const { data: requests, error: requestsError } = await supabase
        .from("friendships")
        .select("id, user_id, friend_id, created_at")
        .eq("friend_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (requestsError) throw requestsError;

      // Get requester profiles
      if (requests && requests.length > 0) {
        const requesterIds = requests.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", requesterIds);

        const requestsWithNames = requests.map((req) => {
          const profile = profiles?.find((p) => p.id === req.user_id);
          return {
            ...req,
            requester_name: profile?.full_name || "Unknown User",
            requester_avatar: profile?.avatar_url,
          };
        });
        setFriendRequests(requestsWithNames);
      }

      // Get recent group messages from groups user is in
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map((m) => m.group_id);
        
        const { data: messages } = await supabase
          .from("group_messages")
          .select("id, group_id, message, created_at")
          .in("group_id", groupIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (messages) {
          const { data: groups } = await supabase
            .from("study_groups")
            .select("id, name")
            .in("id", groupIds);

          const activities = messages.map((msg) => {
            const group = groups?.find((g) => g.id === msg.group_id);
            return {
              id: msg.id,
              group_name: group?.name || "Unknown Group",
              message: msg.message,
              created_at: msg.created_at,
            };
          });
          setGroupActivities(activities);
        }
      }
    } catch (error) {
      console.error("Failed to load recent activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async (requestId: string, accept: boolean) => {
    setProcessingRequest(requestId);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(accept ? "Friend request accepted!" : "Friend request declined");
      loadRecentActivity();
    } catch (error) {
      toast.error("Failed to process friend request");
    } finally {
      setProcessingRequest(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-secondary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActivity = friendRequests.length > 0 || groupActivities.length > 0;

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-secondary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        ) : (
          <div className="space-y-4">
            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  Friend Requests
                </div>
                {friendRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={request.requester_avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(request.requester_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{request.requester_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTimeAgo(request.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFriendRequest(request.id, true)}
                        disabled={processingRequest === request.id}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleFriendRequest(request.id, false)}
                        disabled={processingRequest === request.id}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Group Activity */}
            {groupActivities.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Group Activity
                </div>
                {groupActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-3 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {activity.group_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(activity.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">
                      {activity.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
