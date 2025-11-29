import { useEffect, useState } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";

interface SectionSpotlightProps {
  sectionKey: string | null;
  onComplete: (sectionKey: string) => void;
  sectionSteps: Record<string, Step>;
}

const SectionSpotlight = ({ sectionKey, onComplete, sectionSteps }: SectionSpotlightProps) => {
  const [run, setRun] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step[]>([]);

  useEffect(() => {
    if (sectionKey && sectionSteps[sectionKey]) {
      setCurrentStep([sectionSteps[sectionKey]]);
      // Small delay to ensure DOM element exists
      setTimeout(() => setRun(true), 100);
    } else {
      setRun(false);
      setCurrentStep([]);
    }
  }, [sectionKey, sectionSteps]);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      if (sectionKey) {
        onComplete(sectionKey);
      }
    }
  };

  if (!sectionKey || currentStep.length === 0) return null;

  return (
    <Joyride
      steps={currentStep}
      run={run}
      continuous={false}
      showProgress={false}
      showSkipButton={false}
      disableOverlayClose={true}
      disableCloseOnEsc={true}
      hideCloseButton={true}
      spotlightClicks={true}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: "hsl(190, 70%, 50%)",
          textColor: "hsl(0, 0%, 98%)",
          backgroundColor: "hsl(222, 47%, 11%)",
          overlayColor: "rgba(0, 0, 0, 0.85)",
          arrowColor: "hsl(190, 70%, 50%)",
          zIndex: 10000,
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.85)",
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

export default SectionSpotlight;
