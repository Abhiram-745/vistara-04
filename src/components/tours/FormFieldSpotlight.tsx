import { useEffect, useState, useCallback } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";

interface FormFieldSpotlightProps {
  steps: Step[];
  run: boolean;
  onComplete: () => void;
  stepIndex?: number;
}

const FormFieldSpotlight = ({ steps, run, onComplete, stepIndex = 0 }: FormFieldSpotlightProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(stepIndex);

  useEffect(() => {
    setCurrentStepIndex(stepIndex);
  }, [stepIndex]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();
    }
    
    if (type === 'step:after' && action === 'next') {
      setCurrentStepIndex(index + 1);
    }
  }, [onComplete]);

  if (!run || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={currentStepIndex}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      spotlightClicks
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
          borderRadius: "12px",
          boxShadow: "0 0 0 4px hsl(190, 70%, 50%), 0 0 30px 10px hsla(190, 70%, 50%, 0.4)",
        },
        tooltip: {
          borderRadius: "16px",
          padding: "20px 24px",
          boxShadow: "0 20px 60px -15px rgba(0, 0, 0, 0.5)",
          fontSize: "14px",
          maxWidth: "320px",
          border: "1px solid hsla(190, 70%, 50%, 0.3)",
          background: "linear-gradient(145deg, hsl(222, 47%, 11%), hsl(222, 47%, 8%))",
        },
        tooltipContainer: {
          textAlign: "center",
        },
        tooltipContent: {
          fontSize: "14px",
          lineHeight: "1.6",
          padding: "0",
          color: "hsl(0, 0%, 90%)",
        },
        buttonNext: {
          backgroundColor: "hsl(190, 70%, 50%)",
          borderRadius: "10px",
          padding: "12px 24px",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 4px 15px hsla(190, 70%, 50%, 0.4)",
        },
        buttonBack: {
          color: "hsl(0, 0%, 70%)",
          marginRight: "8px",
        },
        buttonSkip: {
          color: "hsl(0, 0%, 60%)",
        },
      }}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
        offset: 15,
      }}
    />
  );
};

export default FormFieldSpotlight;
