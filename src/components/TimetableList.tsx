import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Timetable {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  schedule: any;
  created_at: string;
}

interface TimetableListProps {
  userId: string;
}

const TimetableList = ({ userId }: TimetableListProps) => {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetables();
  }, [userId]);

  const fetchTimetables = async () => {
    const { data, error } = await supabase
      .from("timetables")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load timetables");
    } else {
      setTimetables(data || []);
    }
    setLoading(false);
  };

  const deleteTimetable = async (id: string) => {
    const { error } = await supabase
      .from("timetables")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete timetable");
    } else {
      toast.success("Timetable deleted");
      fetchTimetables();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading timetables...</div>;
  }

  if (timetables.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No timetables yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first timetable to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {timetables.map((timetable) => (
        <Card key={timetable.id} className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{timetable.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTimetable(timetable.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              {new Date(timetable.start_date).toLocaleDateString("en-GB")} -{" "}
              {new Date(timetable.end_date).toLocaleDateString("en-GB")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timetable.schedule && Object.keys(timetable.schedule).length > 0 ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">Schedule Overview:</p>
                  <p className="text-muted-foreground">
                    {Object.keys(timetable.schedule).length} days planned
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No schedule data</p>
              )}
              <Link to={`/timetable/${timetable.id}`}>
                <Button className="w-full gap-2 bg-gradient-primary hover:opacity-90">
                  <Eye className="h-4 w-4" />
                  View Timetable
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TimetableList;
