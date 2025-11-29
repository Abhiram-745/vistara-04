import { Step } from "react-joyride";

export const dashboardSectionSteps: Record<string, Step> = {
  "greeting": {
    target: "[data-tour='dashboard-greeting']",
    content: "Welcome to your personalized dashboard! This shows your daily greeting and quick access to key features.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "progress": {
    target: "[data-tour='progress-section']",
    content: "Track your study progress here - see your streaks, XP, and achievements!",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "weekly-goals": {
    target: "[data-tour='weekly-goals']",
    content: "Set and track your weekly study goals. Stay motivated by hitting your targets!",
    disableBeacon: true,
    placement: "right",
    spotlightPadding: 15,
  },
  "deadlines": {
    target: "[data-tour='upcoming-deadlines']",
    content: "Never miss a deadline! This shows all your upcoming tests and homework due dates.",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
  "events": {
    target: "[data-tour='events-widget']",
    content: "See your upcoming events and commitments at a glance.",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
  "analytics": {
    target: "[data-tour='daily-insights']",
    content: "Get AI-powered insights about your study patterns and performance!",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
  "timetables": {
    target: "[data-tour='timetables-section']",
    content: "View and manage all your study timetables. Click any timetable to see your schedule!",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
  "new-timetable": {
    target: "[data-tour='new-timetable']",
    content: "Create a new AI-generated study timetable tailored to your subjects and goals!",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
};
