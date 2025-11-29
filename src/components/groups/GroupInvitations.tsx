import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Invitation {
  id: string;
  group_id: string;
  inviter_id: string;
  status: string;
  created_at: string;
  group_name: string;
  group_description?: string;
  inviter_name: string;
  inviter_avatar?: string;
}

export const GroupInvitations = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadInvitations();

    // Realtime subscription
    const channel = supabase
      .channel('group-invitations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_invitations'
        },
        () => {
          loadInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: invitationsData } = await supabase
        .from("group_invitations")
        .select("*")
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!invitationsData || invitationsData.length === 0) {
        setInvitations([]);
        setLoading(false);
        return;
      }

      // Get group details
      const groupIds = invitationsData.map(i => i.group_id);
      const { data: groups } = await supabase
        .from("study_groups")
        .select("id, name, description")
        .in("id", groupIds);

      // Get inviter profiles
      const inviterIds = invitationsData.map(i => i.inviter_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", inviterIds);

      const enrichedInvitations = invitationsData.map(inv => {
        const group = groups?.find(g => g.id === inv.group_id);
        const profile = profiles?.find(p => p.id === inv.inviter_id);
        return {
          ...inv,
          group_name: group?.name || "Unknown Group",
          group_description: group?.description,
          inviter_name: profile?.full_name || "Unknown User",
          inviter_avatar: profile?.avatar_url,
        };
      });

      setInvitations(enrichedInvitations);
    } catch (error) {
      console.error("Error loading invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string, groupId: string) => {
    try {
      setResponding(prev => new Set(prev).add(invitationId));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update invitation status
      const { error: updateError } = await supabase
        .from("group_invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId);

      if (updateError) throw updateError;

      // Add user to group
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: "member",
        });

      if (memberError) throw memberError;

      toast.success("Joined group successfully!");
      navigate(`/groups/${groupId}`);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
    } finally {
      setResponding(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      setResponding(prev => new Set(prev).add(invitationId));

      const { error } = await supabase
        .from("group_invitations")
        .update({ status: "rejected" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation declined");
      loadInvitations();
    } catch (error: any) {
      console.error("Error declining invitation:", error);
      toast.error("Failed to decline invitation");
    } finally {
      setResponding(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20" style={{ display: invitations.length === 0 ? 'none' : 'block' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Group Invitations ({invitations.length})
        </CardTitle>
        <CardDescription>Respond to pending group invitations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invitations.map(invitation => {
            const isResponding = responding.has(invitation.id);
            return (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={invitation.inviter_avatar} />
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {getInitials(invitation.inviter_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{invitation.group_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Invited by {invitation.inviter_name}
                    </p>
                    {invitation.group_description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {invitation.group_description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invitation.id, invitation.group_id)}
                    disabled={isResponding}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isResponding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDecline(invitation.id)}
                    disabled={isResponding}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
