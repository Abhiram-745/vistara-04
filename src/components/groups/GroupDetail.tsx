import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Settings, LogOut, Copy, CheckCircle2, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import { GroupTimetables } from "./GroupTimetables";
import { GroupResources } from "./GroupResources";
import { InviteFriendsDialog } from "./InviteFriendsDialog";
import { GroupChallenge } from "./GroupChallenge";
import { GroupAchievements } from "./GroupAchievements";
import { useSectionTour } from "@/hooks/useSectionTour";
import SectionSpotlight from "@/components/tours/SectionSpotlight";
import { groupDetailSectionSteps } from "@/components/tours/groupSectionSteps";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    subject: "",
    is_private: false,
    max_members: 10,
  });
  
  const { activeTourSection, markSectionViewed, handleSectionClick } = useSectionTour("group-detail");

  useEffect(() => {
    if (id) {
      loadGroupDetails();
    }
  }, [id]);

  const loadGroupDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: groupData } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (groupData) {
        setGroup(groupData);
        setEditForm({
          name: groupData.name || "",
          description: groupData.description || "",
          subject: groupData.subject || "",
          is_private: groupData.is_private || false,
          max_members: groupData.max_members || 10,
        });
      }

      const { data: membersData } = await supabase
        .from('group_members')
        .select('id, user_id, role')
        .eq('group_id', id);

      if (membersData) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const enrichedMembers = membersData.map(m => ({
          ...m,
          profiles: { 
            full_name: profilesMap.get(m.user_id)?.full_name || 'Unknown',
            avatar_url: profilesMap.get(m.user_id)?.avatar_url || undefined
          }
        }));
        
        setMembers(enrichedMembers);
        
        const currentMember = enrichedMembers.find(m => m.user_id === user.id);
        setCurrentUserRole(currentMember?.role || null);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', user.id);

      toast.success('Left group successfully');
      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  const handleCopyJoinCode = async () => {
    if (group?.join_code) {
      await navigator.clipboard.writeText(group.join_code);
      setCopiedCode(true);
      toast.success("Join code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase
        .from('study_groups')
        .update({
          name: editForm.name,
          description: editForm.description,
          subject: editForm.subject,
          is_private: editForm.is_private,
          max_members: editForm.max_members,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Group settings updated!');
      setShowSettings(false);
      loadGroupDetails();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group settings');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Group not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/groups')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Groups
        </Button>

        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{group.name}</h1>
              {group.description && (
                <p className="text-muted-foreground mb-4">{group.description}</p>
              )}
              {group.subject && (
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {group.subject}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {currentUserRole === 'admin' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <UserPlus className="w-4 h-4" /> Invite Friends
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeaveGroup}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" /> Leave Group
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{members.length} members</span>
          </div>

          {group.is_private && group.join_code && currentUserRole === 'admin' && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Private Group Join Code:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-background rounded text-lg font-bold tracking-wider">
                  {group.join_code}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyJoinCode}
                  className="gap-2"
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this code with people you want to invite to the group
              </p>
            </div>
          )}
        </Card>

        <div 
          data-tour="group-challenges" 
          onClick={() => handleSectionClick("challenges")}
        >
          <GroupChallenge groupId={id!} isAdmin={currentUserRole === 'admin'} />
        </div>
        
        <div 
          data-tour="group-achievements" 
          onClick={() => handleSectionClick("achievements")}
        >
          <GroupAchievements groupId={id!} />
        </div>

        <Tabs defaultValue="timetables" className="space-y-6">
          <TabsList>
            <TabsTrigger 
              value="timetables" 
              onClick={() => handleSectionClick("timetables")}
            >
              Timetables
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              onClick={() => handleSectionClick("members")}
            >
              Members
            </TabsTrigger>
            <TabsTrigger 
              value="resources" 
              onClick={() => handleSectionClick("resources")}
            >
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timetables" data-tour="group-timetables">
            <GroupTimetables groupId={id!} />
          </TabsContent>

          <TabsContent value="members" data-tour="group-members">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Group Members ({members.length})
              </h3>
              
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        <AvatarImage src={member.profiles?.avatar_url} />
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {member.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.profiles?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="resources" data-tour="group-resources">
            <GroupResources groupId={id!} />
          </TabsContent>
        </Tabs>
        
        <SectionSpotlight
          sectionKey={activeTourSection}
          onComplete={markSectionViewed}
          sectionSteps={groupDetailSectionSteps}
        />
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Group Settings</DialogTitle>
            <DialogDescription>
              Update your group information and preferences
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Math Study Group"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="What's this group about?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                placeholder="e.g., Maths, Physics, English"
              />
            </div>

            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="flex-1 space-y-0.5">
                <Label htmlFor="private">Private Group</Label>
                <p className="text-sm text-muted-foreground">
                  Require a join code to join this group
                </p>
              </div>
              <Switch
                id="private"
                checked={editForm.is_private}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_private: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_members">Maximum Members</Label>
              <Input
                id="max_members"
                type="number"
                min="2"
                max="100"
                value={editForm.max_members}
                onChange={(e) => setEditForm({ ...editForm, max_members: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={!editForm.name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Friends Dialog */}
      <InviteFriendsDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        groupId={id!}
      />
    </div>
  );
};

export default GroupDetail;
