import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";

interface WizardTourProps {
  currentStep: number;
}

const WizardTour = ({ currentStep }: WizardTourProps) => {
  const [runTour, setRunTour] = useState(false);
  const [tourStep, setTourStep] = useState<Step[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    checkIfNewUser();
  }, []);

  useEffect(() => {
    if (!isNewUser) return;
    
    // Check if this step's tour has already been shown
    if (completedSteps.includes(currentStep)) {
      setRunTour(false);
      return;
    }

    const steps = getStepsForWizardStep(currentStep);
    if (steps.length > 0) {
      setTourStep(steps);
      // Delay to ensure DOM elements are rendered
      setTimeout(() => {
        setRunTour(true);
      }, 300);
    }
  }, [currentStep, isNewUser, completedSteps]);

  const checkIfNewUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has existing timetables
    const { data: existingTimetables } = await supabase
      .from("timetables")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    // Only show wizard tour for new users without timetables
    if (!existingTimetables || existingTimetables.length === 0) {
      setIsNewUser(true);
      // Load completed steps from localStorage
      const completed = JSON.parse(localStorage.getItem(`wizard_tour_completed_${user.id}`) || "[]");
      setCompletedSteps(completed);
    }
  };

  const getStepsForWizardStep = (wizardStep: number): Step[] => {
    switch (wizardStep) {
      case 1:
        return [{
          target: "[data-tour='subjects-step']",
          content: "Start by adding your subjects. Click 'Add Subject' and select your GCSE subjects along with their study mode - whether you have upcoming exams or just regular study.",
          disableBeacon: true,
          placement: "bottom",
          spotlightPadding: 15,
          hideCloseButton: true,
          disableOverlayClose: true,
        }];
      case 2:
        return [{
          target: "[data-tour='topics-step']",
          content: "Now add the topics you're studying for each subject. You can type them manually or use AI to automatically generate topics based on your exam board.",
          disableBeacon: true,
          placement: "bottom",
          spotlightPadding: 15,
          hideCloseButton: true,
          disableOverlayClose: true,
        }];
      case 3:
        return [{
          target: "[data-tour='difficult-topics-step']",
          content: "Select topics you find challenging and explain why. This helps the AI prioritize these topics and give you more study time where you need it most.",
          disableBeacon: true,
          placement: "bottom",
          spotlightPadding: 15,
          hideCloseButton: true,
          disableOverlayClose: true,
        }];
      case 4:
        return [{
          target: "[data-tour='test-dates-step']",
          content: "Add your upcoming test dates. The AI will work backwards from these dates to ensure you're fully prepared before each exam.",
          disableBeacon: true,
          placement: "bottom",
          spotlightPadding: 15,
          hideCloseButton: true,
          disableOverlayClose: true,
        }];
      case 5:
        return [{
          target: "[data-tour='preferences-step']",
          content: "Set your study preferences - how many hours per day, session length, break duration, and which days you want to study. The AI will respect these when creating your schedule.",
          disableBeacon: true,
          placement: "top",
          spotlightPadding: 15,
          hideCloseButton: true,
          disableOverlayClose: true,
        }];
      case 6:
        return [{
          target: "[data-tour='homework-step']",
          content: "Add any homework assignments with their due dates. The AI will schedule time to complete these before they're due.",
          disableBeacon: true,
          placement: "bottom",
          spotlightPadding: 15,
          hideCloseButton: true,
          disableOverlayClose: true,
        }];
      case 7:
        return [{
          target: "[data-tour='dates-step']",
          content: "Choose when your timetable should start and end. Give it a name so you can easily find it later.",
          disableBeacon: true,
          placement: "bottom",
          spotlightPadding: 15,
          hideCloseButton: true,
          disableOverlayClose: true,
        }];
      case 8:
        return [{
          target: "[data-tour='generate-step']",
          content: "Review your settings and click 'Generate Timetable'. The AI will create a personalized study schedule optimized for your goals!",
          disableBeacon: true,
          placement: "top",
          spotlightPadding: 15,
          hideCloseButton: true,
          disableOverlayClose: true,
        }];
      default:
        return [];
    }
  };

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED) {
      setRunTour(false);
      
      // Mark this step as completed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const newCompleted = [...completedSteps, currentStep];
        setCompletedSteps(newCompleted);
        localStorage.setItem(`wizard_tour_completed_${user.id}`, JSON.stringify(newCompleted));
      }
    }
  };

  if (!isNewUser) return null;

  return (
    <Joyride
      steps={tourStep}
      run={runTour}
      continuous={false}
      showProgress={false}
      showSkipButton={false}
      disableOverlayClose={true}
      disableCloseOnEsc={true}
      hideCloseButton={true}
      spotlightClicks={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(190, 70%, 50%)",
          textColor: "hsl(0, 0%, 98%)",
          backgroundColor: "hsl(222, 47%, 11%)",
          overlayColor: "rgba(0, 0, 0, 0.9)",
          arrowColor: "hsl(190, 70%, 50%)",
          zIndex: 10000,
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.9)",
        },
        spotlight: {
          borderRadius: "16px",
          boxShadow: "0 0 0 4px hsl(190, 70%, 50%), 0 0 40px 15px hsla(190, 70%, 50%, 0.5)",
        },
        tooltip: {
          borderRadius: "16px",
          padding: "24px 28px",
          boxShadow: "0 25px 80px -20px rgba(0, 0, 0, 0.6)",
          fontSize: "15px",
          maxWidth: "360px",
          border: "1px solid hsla(190, 70%, 50%, 0.3)",
          background: "linear-gradient(145deg, hsl(222, 47%, 11%), hsl(222, 47%, 8%))",
        },
        tooltipContainer: {
          textAlign: "center",
        },
        tooltipContent: {
          fontSize: "15px",
          lineHeight: "1.7",
          padding: "0",
          color: "hsl(0, 0%, 90%)",
        },
        buttonNext: {
          backgroundColor: "hsl(190, 70%, 50%)",
          borderRadius: "12px",
          padding: "14px 28px",
          fontSize: "14px",
          fontWeight: 600,
          boxShadow: "0 6px 20px hsla(190, 70%, 50%, 0.5)",
        },
        buttonBack: {
          display: "none",
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
            filter: "drop-shadow(0 15px 40px rgba(0, 0, 0, 0.4))",
          },
        },
      }}
    />
  );
};

export default WizardTour;
