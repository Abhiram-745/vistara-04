import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Link2, FileText, ExternalLink, BookOpen, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TimetableSession {
  time: string;
  duration: number;
  subject: string;
  topic: string;
  type: string;
  notes?: string;
  testDate?: string;
  homeworkDueDate?: string;
  completed?: boolean;
}

interface TimetableSchedule {
  [date: string]: TimetableSession[];
}

interface SessionResource {
  id: string;
  title: string;
  url?: string;
  notes?: string;
  type: string;
  session_id: string;
}

interface TopicWithResources {
  topicName: string;
  subject: string;
  resources: SessionResource[];
  sessionCount: number;
}

interface TopicResourcesPanelProps {
  timetableId: string;
  schedule: TimetableSchedule;
}

export const TopicResourcesPanel = ({ timetableId, schedule }: TopicResourcesPanelProps) => {
  const [topicsData, setTopicsData] = useState<TopicWithResources[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTopicsWithResources();
  }, [timetableId, schedule]);

  const fetchTopicsWithResources = async () => {
    setLoading(true);
    try {
      // Fetch timetable data to get the actual topics the user added
      const { data: timetableData, error: timetableError } = await supabase
        .from("timetables")
        .select("topics")
        .eq("id", timetableId)
        .single();

      if (timetableError) throw timetableError;

      // Create a set of valid topic names from the user's actual topics
      const userTopics = new Set<string>(
        (timetableData.topics as any[] || []).map((t: any) => t.name.toLowerCase())
      );

      // Fetch all resources for this timetable
      const { data: resources, error } = await supabase
        .from("session_resources")
        .select("*")
        .eq("timetable_id", timetableId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Extract unique topics from schedule - ONLY include topics that exist in user's topic list
      const topicsMap = new Map<string, TopicWithResources>();

      Object.entries(schedule).forEach(([date, sessions]) => {
        sessions.forEach((session, index) => {
          // Only include revision/study sessions (exclude breaks and homework)
          // AND only if the topic is in the user's actual topic list
          if (
            session.type !== "break" && 
            session.type !== "homework" &&
            userTopics.has(session.topic.toLowerCase())
          ) {
            const topicKey = `${session.subject}-${session.topic}`;

            if (!topicsMap.has(topicKey)) {
              topicsMap.set(topicKey, {
                topicName: session.topic,
                subject: session.subject,
                resources: [],
                sessionCount: 0,
              });
            }

            const topicData = topicsMap.get(topicKey)!;
            topicData.sessionCount++;
          }
        });
      });

      // Now add resources by matching topic and subject (more reliable than session_id)
      resources?.forEach(resource => {
        if (resource.topic && resource.subject) {
          const topicKey = `${resource.subject}-${resource.topic}`;
          const topicData = topicsMap.get(topicKey);
          if (topicData) {
            topicData.resources.push(resource);
          }
        }
      });

      // Convert map to array and sort by subject and topic name
      const topicsArray = Array.from(topicsMap.values()).sort((a, b) => {
        if (a.subject !== b.subject) {
          return a.subject.localeCompare(b.subject);
        }
        return a.topicName.localeCompare(b.topicName);
      });

      setTopicsData(topicsArray);
    } catch (error) {
      console.error("Error fetching topics with resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicKey: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicKey)) {
      newExpanded.delete(topicKey);
    } else {
      newExpanded.add(topicKey);
    }
    setExpandedTopics(newExpanded);
  };

  // Filter topics based on search query
  const filteredTopics = topicsData.filter((topic) => {
    const query = searchQuery.toLowerCase();
    return (
      topic.topicName.toLowerCase().includes(query) ||
      topic.subject.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            All Revision Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading topics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          All Revision Topics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          View all topics and their resources ({topicsData.length} topics)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search topics or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[450px] pr-4">
            {filteredTopics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No topics match your search" : "No topics found in this timetable"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTopics.map((topic) => {
                const topicKey = `${topic.subject}-${topic.topicName}`;
                const isExpanded = expandedTopics.has(topicKey);

                return (
                  <Collapsible
                    key={topicKey}
                    open={isExpanded}
                    onOpenChange={() => toggleTopic(topicKey)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-4 h-auto hover:bg-accent"
                        >
                          <div className="flex items-start gap-3 text-left flex-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 mt-1 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mt-1 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{topic.topicName}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {topic.subject}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {topic.sessionCount} session{topic.sessionCount !== 1 ? "s" : ""}
                                </span>
                                {topic.resources.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {topic.resources.length} resource{topic.resources.length !== 1 ? "s" : ""}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t bg-muted/30 p-4">
                          {topic.resources.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No resources added yet. Click on study sessions in your timetable to add resources.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {topic.resources.map((resource) => (
                                <div
                                  key={resource.id}
                                  className="p-3 bg-card rounded-lg border"
                                >
                                  <div className="flex items-start gap-3">
                                    {resource.type === "link" ? (
                                      <Link2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium text-sm">{resource.title}</h4>
                                        {resource.type === "link" && resource.url && (
                                          <a
                                            href={resource.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:text-primary/80"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>
                                      {resource.url && resource.type === "link" && (
                                        <p className="text-xs text-muted-foreground break-all mb-2">
                                          {resource.url}
                                        </p>
                                      )}
                                      {resource.notes && (
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                          {resource.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
