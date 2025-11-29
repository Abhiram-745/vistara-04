import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Trophy, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import FriendsList from "@/components/social/FriendsList";
import AddFriend from "@/components/social/AddFriend";
import Leaderboard from "@/components/social/Leaderboard";
import { GroupLeaderboard } from "@/components/social/GroupLeaderboard";
import SocialStats from "@/components/social/SocialStats";
import { GroupInvitations } from "@/components/groups/GroupInvitations";
import PageTransition from "@/components/PageTransition";

const Social = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserId(session.user.id);
      setLoading(false);
    } else {
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="space-y-6 animate-fade-in" data-tour="social-page">
          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold gradient-text">
              Social Hub
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              Connect with friends and compete on the leaderboard
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 gap-2 glass-card p-1 rounded-xl">
              <TabsTrigger value="friends" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white rounded-lg">
                <Users className="h-4 w-4" />
                Friends
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white rounded-lg">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white rounded-lg">
                <TrendingUp className="h-4 w-4" />
                Stats
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-6 mt-6">
              <GroupInvitations />
              <div data-tour="add-friend">
                <AddFriend userId={userId} />
              </div>
              <div data-tour="friends-list">
                <FriendsList userId={userId} />
              </div>
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-6 mt-6">
              <div data-tour="leaderboard">
                <Leaderboard userId={userId} />
              </div>
              <GroupLeaderboard />
            </TabsContent>

            <TabsContent value="stats" className="mt-6">
              <SocialStats userId={userId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
    </PageTransition>
  );
};

export default Social;
