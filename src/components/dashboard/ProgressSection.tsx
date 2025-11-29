import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudyStreakTracker } from "@/components/StudyStreakTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Leaderboard from "@/components/social/Leaderboard";
import { GroupLeaderboard } from "@/components/social/GroupLeaderboard";
import { Trophy, Users } from "lucide-react";

interface ProgressSectionProps {
  userId: string;
}

export const ProgressSection = ({ userId }: ProgressSectionProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Study Streak */}
      <StudyStreakTracker userId={userId} />

      {/* Leaderboards */}
      <div className="space-y-4">
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="global" className="gap-2">
              <Trophy className="h-4 w-4" />
              Global
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              Groups
            </TabsTrigger>
          </TabsList>
          <TabsContent value="global">
            <div className="max-h-[500px] overflow-y-auto">
              <Leaderboard userId={userId} />
            </div>
          </TabsContent>
          <TabsContent value="groups">
            <div className="max-h-[500px] overflow-y-auto">
              <GroupLeaderboard />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

