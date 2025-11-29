import { Step } from "react-joyride";

export const homeworkSectionSteps: Record<string, Step> = {
  "add-homework": {
    target: "[data-tour='add-homework']",
    content: "Add new homework assignments here. Set a due date and it will appear in your timetable!",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "homework-list": {
    target: "[data-tour='homework-list']",
    content: "View all your homework here. Check off completed items and track what's coming up.",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
  "filter-tabs": {
    target: "[data-tour='homework-filters']",
    content: "Filter your homework by status - see all, pending, or completed assignments.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
};
