import { Step } from "react-joyride";

export const calendarSectionSteps: Record<string, Step> = {
  "week-nav": {
    target: "[data-tour='week-navigation']",
    content: "Navigate between weeks using these buttons. Click 'Today' to jump back to the current week.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "timetable-select": {
    target: "[data-tour='timetable-select']",
    content: "Select which timetable you want to view on the calendar.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "time-grid": {
    target: "[data-tour='time-grid']",
    content: "This is your weekly schedule! Sessions are positioned by their actual time. Drag and drop to reschedule.",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
  "legend": {
    target: "[data-tour='calendar-legend']",
    content: "Use this legend to understand what each color represents - revision, homework, events, and more!",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
};
