import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS, ACTIONS } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";

interface ProductTourProps {
  tourKey: string;
  steps: Step[];
  onComplete?: () => void;
  run?: boolean;
}

const ProductTour = ({ tourKey, steps, onComplete, run = false }: ProductTourProps) => {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (run) {
      checkTourStatus();
    }
  }, [run, tourKey]);

  const checkTourStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has completed this tour
    const completedTours = localStorage.getItem(`tour_completed_${user.id}`) || "{}";
    const tourStatus = JSON.parse(completedTours);

    if (!tourStatus[tourKey]) {
      setRunTour(true);
    }
  };

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Mark tour as completed
        const completedTours = localStorage.getItem(`tour_completed_${user.id}`) || "{}";
        const tourStatus = JSON.parse(completedTours);
        tourStatus[tourKey] = true;
        localStorage.setItem(`tour_completed_${user.id}`, JSON.stringify(tourStatus));
      }
      
      setRunTour(false);
      onComplete?.();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      spotlightClicks
      disableOverlayClose
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.75)",
          arrowColor: "hsl(var(--card))",
          zIndex: 10000,
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
        },
        spotlight: {
          borderRadius: "8px",
          boxShadow: "0px 0px 0px 9999px rgba(0, 0, 0, 0.75)",
        },
        tooltip: {
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.4)",
          fontSize: "15px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: "18px",
          fontWeight: 700,
          marginBottom: "8px",
        },
        tooltipContent: {
          fontSize: "14px",
          lineHeight: "1.6",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "10px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          transition: "all 0.2s ease",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "12px",
          fontSize: "14px",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "14px",
        },
      }}
      floaterProps={{
        disableAnimation: false,
        styles: {
          arrow: {
            length: 12,
            spread: 24,
          },
        },
      }}
    />
  );
};

export default ProductTour;
