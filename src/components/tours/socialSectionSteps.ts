import { Step } from "react-joyride";

export const socialSectionSteps: Record<string, Step> = {
  "leaderboard": {
    target: "[data-tour='leaderboard']",
    content: "See how you rank against other students! Climb the leaderboard by completing study sessions.",
    disableBeacon: true,
    placement: "right",
    spotlightPadding: 15,
  },
  "friends-list": {
    target: "[data-tour='friends-list']",
    content: "View your friends and their study progress. Add new friends to compete together!",
    disableBeacon: true,
    placement: "left",
    spotlightPadding: 15,
  },
  "add-friend": {
    target: "[data-tour='add-friend']",
    content: "Search for friends by email and send them a friend request!",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "stats": {
    target: "[data-tour='social-stats']",
    content: "Track your social study statistics - total study time, sessions completed, and more!",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
};
