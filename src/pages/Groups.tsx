import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, Lock, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { JoinGroupModal } from "@/components/groups/JoinGroupModal";
import { GroupInvitations } from "@/components/groups/GroupInvitations";
import { CheckAchievementsButton } from "@/components/groups/CheckAchievementsButton";
import { useSectionTour } from "@/hooks/useSectionTour";
import SectionSpotlight from "@/components/tours/SectionSpotlight";
import { groupsPageSectionSteps } from "@/components/tours/groupSectionSteps";
import PageTransition from "@/components/PageTransition";

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  is_private: boolean;
  member_count: number;
  avatar_url: string;
}

const Groups = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [allGroups, setAllGroups] = useState<StudyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { activeTourSection, markSectionViewed, handleSectionClick } = useSectionTour("groups-page");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadGroups(session.user.id);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadGroups(session.user.id);
      } else {
        setUser(null);
        setMyGroups([]);
        setAllGroups([]);
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadGroups = async (userId: string) => {
    try {
      setLoading(true);

      // Load user's groups
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberData) {
        const groupIds = memberData.map(m => m.group_id);
        
        if (groupIds.length > 0) {
          const { data: groupsData } = await supabase
            .from('study_groups')
            .select('*')
            .in('id', groupIds);

          if (groupsData) {
            const groupsWithCounts = await Promise.all(
              groupsData.map(async (group) => {
                const { count } = await supabase
                  .from('group_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('group_id', group.id);

                return {
                  ...group,
                  member_count: count || 0
                };
              })
            );
            setMyGroups(groupsWithCounts);
          } else {
            setMyGroups([]);
          }
        } else {
          setMyGroups([]);
        }
      }

      // Load all public groups
      const { data: publicGroups } = await supabase
        .from('study_groups')
        .select('*')
        .eq('is_private', false);

      if (publicGroups) {
        const groupsWithCounts = await Promise.all(
          publicGroups.map(async (group) => {
            const { count } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id);

            return {
              ...group,
              member_count: count || 0
            };
          })
        );
        setAllGroups(groupsWithCounts);
      } else {
        setAllGroups([]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = allGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageTransition>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-blob top-20 -left-32 w-96 h-96 bg-primary/10 animate-float"></div>
        <div className="floating-blob top-40 right-10 w-[500px] h-[500px] bg-secondary/15 animate-float-delayed"></div>
        <div className="floating-blob bottom-20 left-1/3 w-80 h-80 bg-accent/10 animate-float-slow"></div>
      </div>

      <Header />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="space-y-6">
          <GroupInvitations />

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-display font-bold gradient-text mb-2">Study Groups</h1>
              <p className="text-muted-foreground text-lg">Collaborate and learn together</p>
            </div>
            
            <div className="flex gap-2">
              <CheckAchievementsButton />
              <Button 
                onClick={() => {
                  handleSectionClick("join-code");
                  setShowJoinModal(true);
                }} 
                variant="outline" 
                className="gap-2 hover-lift"
                data-tour="join-code"
              >
                <Search className="w-4 h-4" /> Join with Code
              </Button>
              <Button 
                onClick={() => {
                  handleSectionClick("create-group");
                  setShowCreateModal(true);
                }} 
                className="gap-2"
                data-tour="create-group"
              >
                <Plus className="h-4 w-4" /> Create Group
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="my-groups" className="space-y-6">
          <TabsList className="glass-card p-1 rounded-xl">
            <TabsTrigger 
              value="my-groups" 
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white rounded-lg"
              onClick={() => handleSectionClick("my-groups")}
              data-tour="my-groups-tab"
            >
              My Groups
            </TabsTrigger>
            <TabsTrigger 
              value="discover" 
              className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white rounded-lg"
              onClick={() => handleSectionClick("discover")}
              data-tour="discover-tab"
            >
              Discover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-groups" className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : myGroups.length === 0 ? (
              <Card className="p-12 text-center hover-lift">
                <Users className="w-16 h-16 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-display font-bold gradient-text mb-2">No groups yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create or join a group to start collaborating
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Your First Group
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myGroups.map(group => (
                  <Card
                    key={group.id}
                    className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        {group.is_private ? (
                          <Lock className="w-6 h-6 text-primary" />
                        ) : (
                          <Globe className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {group.member_count} members
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {group.name}
                    </h3>
                    
                    {group.subject && (
                      <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded mb-2">
                        {group.subject}
                      </span>
                    )}
                    
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search groups by name, subject, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map(group => (
                <Card
                  key={group.id}
                  className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {group.member_count} members
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {group.name}
                  </h3>
                  
                  {group.subject && (
                    <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded mb-2">
                      {group.subject}
                    </span>
                  )}
                  
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateGroupModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => user && loadGroups(user.id)}
      />
      
      <JoinGroupModal
        open={showJoinModal}
        onOpenChange={setShowJoinModal}
        onSuccess={() => user && loadGroups(user.id)}
      />
      
      <SectionSpotlight
        sectionKey={activeTourSection}
        onComplete={markSectionViewed}
        sectionSteps={groupsPageSectionSteps}
      />
    </div>
    </PageTransition>
  );
};

export default Groups;
