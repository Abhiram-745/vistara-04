import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProductTour from "./ProductTour";
import {
  dashboardTourSteps,
  socialTourSteps,
  groupsTourSteps,
  calendarTourSteps,
  eventsTourSteps,
  homeworkTourSteps,
  testScoresTourSteps,
  aiInsightsTourSteps,
  reflectionsTourSteps,
  timetablesTourSteps,
} from "./tourSteps";

const TourManager = () => {
  const location = useLocation();
  const [activeTour, setActiveTour] = useState<string | null>(null);

  useEffect(() => {
    // Don't show tours if guided onboarding is in progress
    const checkOnboardingStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const onboardingStage = localStorage.getItem(`onboarding_stage_${user.id}`);
      const onboardingCompleted = localStorage.getItem(`onboarding_completed_${user.id}`);
      
      // Only show context-sensitive tours after guided onboarding is complete
      if (!onboardingCompleted || onboardingStage !== "completed") {
        return;
      }
      
      // Determine which tour to show based on the current route
      const path = location.pathname;
      
      if (path === "/dashboard" || path === "/") {
        setActiveTour("dashboard");
      } else if (path === "/social") {
        setActiveTour("social");
      } else if (path === "/groups") {
        setActiveTour("groups");
      } else if (path === "/calendar") {
        setActiveTour("calendar");
      } else if (path === "/events") {
        setActiveTour("events");
      } else if (path === "/homework") {
        setActiveTour("homework");
      } else if (path === "/test-scores") {
        setActiveTour("test-scores");
      } else if (path === "/ai-insights") {
        setActiveTour("ai-insights");
      } else if (path === "/reflections") {
        setActiveTour("reflections");
      } else if (path === "/timetables") {
        setActiveTour("timetables");
      } else {
        setActiveTour(null);
      }
    };
    
    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      checkOnboardingStatus();
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {activeTour === "dashboard" && (
        <ProductTour
          tourKey="dashboard"
          steps={dashboardTourSteps}
          run={true}
        />
      )}
      {activeTour === "social" && (
        <ProductTour
          tourKey="social"
          steps={socialTourSteps}
          run={true}
        />
      )}
      {activeTour === "groups" && (
        <ProductTour
          tourKey="groups"
          steps={groupsTourSteps}
          run={true}
        />
      )}
      {activeTour === "calendar" && (
        <ProductTour
          tourKey="calendar"
          steps={calendarTourSteps}
          run={true}
        />
      )}
      {activeTour === "events" && (
        <ProductTour
          tourKey="events"
          steps={eventsTourSteps}
          run={true}
        />
      )}
      {activeTour === "homework" && (
        <ProductTour
          tourKey="homework"
          steps={homeworkTourSteps}
          run={true}
        />
      )}
      {activeTour === "test-scores" && (
        <ProductTour
          tourKey="test-scores"
          steps={testScoresTourSteps}
          run={true}
        />
      )}
      {activeTour === "ai-insights" && (
        <ProductTour
          tourKey="ai-insights"
          steps={aiInsightsTourSteps}
          run={true}
        />
      )}
      {activeTour === "reflections" && (
        <ProductTour
          tourKey="reflections"
          steps={reflectionsTourSteps}
          run={true}
        />
      )}
      {activeTour === "timetables" && (
        <ProductTour
          tourKey="timetables"
          steps={timetablesTourSteps}
          run={true}
        />
      )}
    </>
  );
};

export default TourManager;
