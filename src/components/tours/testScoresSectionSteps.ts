import { Step } from "react-joyride";

export const testScoresPageSteps: Record<string, Step> = {
  "add-score": {
    target: "[data-tour='add-test-score']",
    content: "Click here to add a new test score. You'll be able to enter your marks and get AI-powered analysis!",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "scores-list": {
    target: "[data-tour='scores-list']",
    content: "View all your test scores here. Each score shows your percentage and AI analysis.",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
};

export const testScoreFormSteps: Record<string, Step> = {
  "select-test": {
    target: "[data-tour='test-select']",
    content: "First, select the test you took from your test dates list.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 10,
  },
  "total-marks": {
    target: "[data-tour='total-marks']",
    content: "Enter the total marks possible for this test.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 10,
  },
  "marks-obtained": {
    target: "[data-tour='marks-obtained']",
    content: "Enter how many marks you achieved.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 10,
  },
  "questions-correct": {
    target: "[data-tour='questions-correct']",
    content: "List the topics or questions you got right - one per line.",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 10,
  },
  "questions-wrong": {
    target: "[data-tour='questions-wrong']",
    content: "List the topics you struggled with - our AI will use this to help you improve!",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 10,
  },
  "ai-analysis": {
    target: "[data-tour='ai-analysis']",
    content: "After saving, AI will analyze your results and give personalized recommendations!",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 10,
  },
};
