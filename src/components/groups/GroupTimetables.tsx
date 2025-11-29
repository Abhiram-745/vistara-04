import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Eye, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface SharedTimetable {
  id: string;
  timetable_id: string;
  shared_by: string;
  created_at: string;
  view_count: number;
  timetables: {
    name: string;
    start_date: string;
    end_date: string;
    subjects: any;
    topics: any;
    test_dates: any;
  };
  profiles: {
    full_name: string;
  };
}

interface GroupTimetablesProps {
  groupId: string;
}

export const GroupTimetables = ({ groupId }: GroupTimetablesProps) => {
  const navigate = useNavigate();
  const [sharedTimetables, setSharedTimetables] = useState<SharedTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSharedTimetables();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('shared-timetables-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_timetables',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('Shared timetable change:', payload);
          loadSharedTimetables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const loadSharedTimetables = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data: sharesData, error: sharesError } = await supabase
        .from('shared_timetables')
        .select('id, timetable_id, shared_by, created_at, view_count')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (sharesError) {
        console.error('Error fetching shares:', sharesError);
        throw sharesError;
      }

      if (sharesData && sharesData.length > 0) {
        // Fetch timetable details
        const timetableIds = sharesData.map(s => s.timetable_id);
        const { data: timetablesData, error: timetablesError } = await supabase
          .from('timetables')
          .select('id, name, start_date, end_date, subjects, topics, test_dates')
          .in('id', timetableIds);

        if (timetablesError) {
          console.error('Error fetching timetables:', timetablesError);
        }

        // Fetch profile details
        const userIds = sharesData.map(s => s.shared_by);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        const timetablesMap = new Map(timetablesData?.map(t => [t.id, t]) || []);
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enriched = sharesData
          .map(share => {
            const timetable = timetablesMap.get(share.timetable_id);
            if (!timetable) return null;

            const profile = profilesMap.get(share.shared_by) || { full_name: 'Unknown user' };

            return {
              ...share,
              timetables: timetable,
              profiles: profile,
            } as SharedTimetable;
          })
          .filter(Boolean) as SharedTimetable[];

        setSharedTimetables(enriched);
      } else {
        setSharedTimetables([]);
      }
    } catch (error) {
      console.error('Error loading shared timetables:', error);
      toast.error('Failed to load shared timetables');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleImplement = async (share: SharedTimetable) => {
    try {
      // Increment view count
      await supabase
        .from('shared_timetables')
        .update({ view_count: share.view_count + 1 })
        .eq('id', share.id);

      // Navigate to import page with timetable data
      navigate('/import-timetable', {
        state: {
          sharedTimetable: share.timetables,
          shareId: share.id,
          sharedBy: share.profiles.full_name
        }
      });
    } catch (error) {
      console.error('Error implementing timetable:', error);
      toast.error('Failed to start implementation');
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading shared timetables...</p>
      </Card>
    );
  }

  if (sharedTimetables.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No shared timetables yet</h3>
        <p className="text-muted-foreground">
          Share your timetable with the group to help others plan their study schedule
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Shared Timetables ({sharedTimetables.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadSharedTimetables(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sharedTimetables.map((share) => (
          <Card key={share.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-foreground mb-1">
                    {share.timetables.name}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Shared by {share.profiles.full_name}</span>
                  </div>
                </div>
                <Badge variant="secondary">
                  <Eye className="w-3 h-3 mr-1" />
                  {share.view_count}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(share.timetables.start_date).toLocaleDateString()} -{' '}
                    {new Date(share.timetables.end_date).toLocaleDateString()}
                  </span>
                </div>

                {share.timetables.subjects && (
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(share.timetables.subjects) 
                      ? share.timetables.subjects 
                      : Object.values(share.timetables.subjects)
                    ).slice(0, 3).map((subject: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {typeof subject === 'string' ? subject : subject.name}
                      </Badge>
                    ))}
                    {(Array.isArray(share.timetables.subjects) 
                      ? share.timetables.subjects 
                      : Object.values(share.timetables.subjects)
                    ).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(Array.isArray(share.timetables.subjects) 
                          ? share.timetables.subjects 
                          : Object.values(share.timetables.subjects)
                        ).length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                </span>
                <Button
                  onClick={() => handleImplement(share)}
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Implement
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
