import { Step } from "react-joyride";

export const eventsSectionSteps: Record<string, Step> = {
  "school-schedule": {
    target: "[data-tour='school-schedule']",
    content: "Set your school schedule here. This helps the AI avoid scheduling study sessions during school hours.",
    disableBeacon: true,
    placement: "right",
    spotlightPadding: 15,
  },
  "events-widget": {
    target: "[data-tour='events-list']",
    content: "Add events like activities, appointments, or family commitments. The AI will work around these!",
    disableBeacon: true,
    placement: "left",
    spotlightPadding: 15,
  },
  "add-event": {
    target: "[data-tour='add-event']",
    content: "Click here to add a new event. You can set it as recurring for weekly activities.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
};
