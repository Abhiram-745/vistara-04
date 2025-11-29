import { Step } from "react-joyride";

export const groupDetailSectionSteps: Record<string, Step> = {
  challenges: {
    target: "[data-tour='group-challenges']",
    content: "Set daily, weekly, and monthly study hour goals for your group. Complete challenges together to unlock achievements and stay motivated!",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  achievements: {
    target: "[data-tour='group-achievements']",
    content: "View all the achievements your group has unlocked! Work together to hit study goals and earn badges.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  timetables: {
    target: "[data-tour='group-timetables']",
    content: "Share your study timetables with the group! See what others are studying and coordinate your revision sessions.",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
  members: {
    target: "[data-tour='group-members']",
    content: "View all members in your study group. Admins can manage member roles and invite new people.",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
  resources: {
    target: "[data-tour='group-resources']",
    content: "Share useful study resources like notes, videos, and practice papers with your group!",
    disableBeacon: true,
    placement: "top",
    spotlightPadding: 15,
  },
};

export const groupsPageSectionSteps: Record<string, Step> = {
  "my-groups": {
    target: "[data-tour='my-groups-tab']",
    content: "View all the study groups you've joined. Click on any group to access its timetables, chat, and resources!",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  discover: {
    target: "[data-tour='discover-tab']",
    content: "Discover public study groups! Search by subject or name and join groups that match your interests.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "create-group": {
    target: "[data-tour='create-group']",
    content: "Create your own study group! Set it as private or public, and invite friends to collaborate.",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
  "join-code": {
    target: "[data-tour='join-code']",
    content: "Have a join code from a friend? Enter it here to join their private study group instantly!",
    disableBeacon: true,
    placement: "bottom",
    spotlightPadding: 15,
  },
};
