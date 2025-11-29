import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { Step, CallBackProps, STATUS, ACTIONS, EVENTS, BeaconRenderProps } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";

type OnboardingStage = 
  | "welcome"
  | "events"
  | "homework"
  | "timetable-create"
  | "timetable-features"
  | "completed";

interface GuidedOnboardingProps {
  onComplete?: () => void;
}

const GuidedOnboarding = ({ onComplete }: GuidedOnboardingProps) => {
  const [stage, setStage] = useState<OnboardingStage>("welcome");
  const [runTour, setRunTour] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (!isNewUser) return;
    
    const checkAndStartTour = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const completedFlag = localStorage.getItem(`onboarding_completed_${user.id}`);
      if (completedFlag === "true") return;

      const visitedTabs = JSON.parse(localStorage.getItem(`onboarding_visited_tabs_${user.id}`) || "[]");
      const currentPath = location.pathname;

      // Map paths to tour stages
      let tourStage: OnboardingStage | null = null;
      if (currentPath === "/events" && !visitedTabs.includes("events")) {
        tourStage = "events";
      } else if (currentPath === "/homework" && !visitedTabs.includes("homework")) {
        tourStage = "homework";
      } else if (currentPath === "/timetables" && !visitedTabs.includes("timetables")) {
        tourStage = "timetable-create";
      } else if (currentPath === "/calendar" && !visitedTabs.includes("calendar")) {
        tourStage = "timetable-features";
      }

      if (tourStage) {
        setStage(tourStage);
        // Small delay to ensure DOM elements are ready
        setTimeout(() => {
          setSteps(getStepsForStage(tourStage!));
          setRunTour(true);
        }, 500);
      }
    };

    checkAndStartTour();
  }, [location.pathname, isNewUser]);

  const checkOnboardingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if this is an existing user (has timetables already)
    const { data: existingTimetables } = await supabase
      .from("timetables")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    // If user has existing timetables, mark as completed and don't show tour
    if (existingTimetables && existingTimetables.length > 0) {
      localStorage.setItem(`onboarding_completed_${user.id}`, "true");
      setStage("completed");
      setRunTour(false);
      setIsNewUser(false);
      return;
    }

    // Check if onboarding already completed
    const completedFlag = localStorage.getItem(`onboarding_completed_${user.id}`);
    if (completedFlag === "true") {
      setStage("completed");
      setRunTour(false);
      setIsNewUser(false);
      return;
    }
    
    // New user without timetables
    setIsNewUser(true);
  };


  const getStepsForStage = (tourStage: OnboardingStage): Step[] => {
    switch (tourStage) {
      case "events":
        return eventsOnboardingSteps;
      case "homework":
        return homeworkOnboardingSteps;
      case "timetable-create":
        return timetableCreateSteps;
      case "timetable-features":
        return timetableFeaturesSteps;
      default:
        return [];
    }
  };

  const markTabAsVisited = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const visitedTabs = JSON.parse(localStorage.getItem(`onboarding_visited_tabs_${user.id}`) || "[]");
    
    // Map stage to tab name
    let tabName = "";
    if (stage === "events") tabName = "events";
    else if (stage === "homework") tabName = "homework";
    else if (stage === "timetable-create") tabName = "timetables";
    else if (stage === "timetable-features") tabName = "calendar";

    if (tabName && !visitedTabs.includes(tabName)) {
      visitedTabs.push(tabName);
      localStorage.setItem(`onboarding_visited_tabs_${user.id}`, JSON.stringify(visitedTabs));
    }
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;

    // Only finish on actual completion - not on skip
    if (status === STATUS.FINISHED) {
      setRunTour(false);
      markTabAsVisited();
    }
    
    // Prevent closing via overlay click or escape
    if (type === EVENTS.TOUR_END && status === STATUS.SKIPPED) {
      // Re-enable the tour if user tries to skip
      setTimeout(() => {
        setRunTour(true);
      }, 100);
    }
  };

  // Spotlight-only step configuration
  const eventsOnboardingSteps: Step[] = [
    {
      target: "[data-tour='school-schedule']",
      content: "Set up your school schedule here - enter when you leave and return. This ensures study sessions are never scheduled during school hours.",
      disableBeacon: true,
      placement: "bottom",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
    {
      target: "[data-tour='add-event']",
      content: "Add your commitments like sports practice or music lessons. Click 'Add Event' to see how it appears in your timetable.",
      placement: "left",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
    {
      target: "[data-tour='events-list']",
      content: "All your events appear here. You can edit or delete them anytime. Continue to homework next!",
      placement: "top",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
  ];

  const homeworkOnboardingSteps: Step[] = [
    {
      target: "[data-tour='add-homework']",
      content: "Add your homework assignments here. Enter subject, title, due date, and estimated time. Vistari will schedule time to complete them!",
      disableBeacon: true,
      placement: "left",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
    {
      target: "[data-tour='active-homework']",
      content: "Your active homework shows up here, sorted by due date. Now let's create your AI-powered timetable!",
      placement: "top",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
  ];

  const timetableCreateSteps: Step[] = [
    {
      target: "[data-tour='new-timetable']",
      content: "Click 'New Timetable' to create your AI-powered study plan! We'll walk you through each step.",
      disableBeacon: true,
      placement: "bottom",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
  ];

  const timetableFeaturesSteps: Step[] = [
    {
      target: "[data-tour='session-card']",
      content: "Click on any study session to start a timer. It automatically asks for feedback when you're done.",
      disableBeacon: true,
      placement: "top",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
    {
      target: "[data-tour='calendar-legend']",
      content: "Colors show activity types: Red = events, Blue = revision, Green = homework, Yellow = test prep.",
      placement: "bottom",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
    {
      target: "[data-tour='daily-insights']",
      content: "Check your daily insights to see progress. The AI learns from your feedback!",
      placement: "left",
      spotlightPadding: 10,
      hideCloseButton: true,
      disableOverlayClose: true,
    },
    {
      target: "body",
      content: "You're all set! Explore Social and Groups to connect with friends. Good luck! 🎉",
      placement: "center",
      hideCloseButton: true,
      disableOverlayClose: true,
    },
  ];

  if (!isNewUser) return null;

  return (
    <>
      {runTour && (
        <Joyride
          steps={steps}
          run={runTour}
          continuous
          showProgress
          showSkipButton={false}
          scrollToFirstStep
          disableScrolling={false}
          disableScrollParentFix={false}
          scrollOffset={100}
          spotlightClicks={true}
          disableOverlayClose={true}
          disableCloseOnEsc={true}
          hideCloseButton={true}
          callback={handleJoyrideCallback}
          styles={{
            options: {
              primaryColor: "hsl(var(--primary))",
              textColor: "hsl(var(--foreground))",
              backgroundColor: "hsl(var(--card))",
              overlayColor: "rgba(0, 0, 0, 0.85)",
              arrowColor: "hsl(var(--primary))",
              zIndex: 10000,
            },
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.85)",
            },
            spotlight: {
              borderRadius: "12px",
              boxShadow: "0 0 0 4px hsl(190 70% 50%), 0 0 30px 10px hsla(190, 70%, 50%, 0.4)",
            },
            tooltip: {
              borderRadius: "16px",
              padding: "20px 24px",
              boxShadow: "0 20px 60px -15px rgba(0, 0, 0, 0.5)",
              fontSize: "15px",
              maxWidth: "320px",
              border: "1px solid hsl(var(--border))",
            },
            tooltipContainer: {
              textAlign: "center",
            },
            tooltipTitle: {
              display: "none",
            },
            tooltipContent: {
              fontSize: "15px",
              lineHeight: "1.6",
              padding: "0",
            },
            buttonNext: {
              backgroundColor: "hsl(var(--primary))",
              borderRadius: "10px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 4px 15px hsla(190, 70%, 50%, 0.4)",
            },
            buttonBack: {
              color: "hsl(var(--muted-foreground))",
              marginRight: "12px",
              fontSize: "14px",
            },
            buttonSkip: {
              display: "none",
            },
            buttonClose: {
              display: "none",
            },
          }}
          floaterProps={{
            disableAnimation: false,
            hideArrow: false,
            offset: 20,
            styles: {
              floater: {
                filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3))",
              },
              arrow: {
                color: "hsl(var(--primary))",
                length: 14,
                spread: 20,
              },
            },
          }}
        />
      )}
    </>
  );
};

export default GuidedOnboarding;