import { Step } from "react-joyride";

export const dashboardTourSteps: Step[] = [
  {
    target: ".dashboard-greeting",
    content: "Welcome to your dashboard! This is your personal study hub where you can see an overview of everything you need to focus on.",
    disableBeacon: true,
  },
  {
    target: ".dashboard-customizer",
    content: "Customize your dashboard by toggling sections on/off and reordering them to fit your preferences.",
  },
  {
    target: ".progress-section",
    content: "Track your study streaks, see leaderboards, and view recent activity from your friends and study groups.",
  },
  {
    target: ".upcoming-deadlines",
    content: "Never miss a deadline! This widget shows your upcoming homework and test dates in order of urgency.",
  },
  {
    target: ".daily-insights",
    content: "Get personalized daily insights and study recommendations based on your performance and habits.",
  },
];

export const socialTourSteps: Step[] = [
  {
    target: "[data-tour='social-page']",
    content: "The Social section lets you connect with friends, compare study stats, and stay motivated together!",
    disableBeacon: true,
  },
  {
    target: "[data-tour='add-friend']",
    content: "Search for friends by email and send them friend requests to start studying together.",
  },
  {
    target: "[data-tour='leaderboard']",
    content: "See how you rank among your friends and the entire Vistari community. Competition drives motivation!",
  },
  {
    target: "[data-tour='friends-list']",
    content: "View all your friends, their study stats, and send them group invitations.",
  },
];

export const groupsTourSteps: Step[] = [
  {
    target: "[data-tour='groups-page']",
    content: "Study Groups are collaborative spaces where you can share timetables, chat, compete in challenges, and learn together!",
    disableBeacon: true,
  },
  {
    target: "[data-tour='create-group']",
    content: "Create a new study group for your class, subject, or friend circle. Set it as private or public!",
  },
  {
    target: "[data-tour='group-challenges']",
    content: "Set daily, weekly, and monthly study hour goals for your group. Complete challenges to unlock achievements!",
  },
  {
    target: "[data-tour='group-chat']",
    content: "Chat with your group members, share study tips, and motivate each other.",
  },
  {
    target: "[data-tour='group-resources']",
    content: "Share useful study resources like notes, videos, and practice questions with your group.",
  },
];

export const calendarTourSteps: Step[] = [
  {
    target: "[data-tour='calendar-page']",
    content: "Your calendar shows all your study sessions, homework, events, and tests in one unified view.",
    disableBeacon: true,
  },
  {
    target: "[data-tour='calendar-legend']",
    content: "Each color represents a different type of activity - revision, homework, events, and test prep sessions.",
  },
  {
    target: "[data-tour='calendar-view-switcher']",
    content: "Switch between week view and day view to see your schedule in different levels of detail.",
  },
  {
    target: "[data-tour='session-card']",
    content: "Click on any session to start a timer, add resources, or mark it complete with reflection.",
  },
];

export const eventsTourSteps: Step[] = [
  {
    target: "[data-tour='events-page']",
    content: "Events help you block out time for activities outside of studying - sports, clubs, family time, etc.",
    disableBeacon: true,
  },
  {
    target: "[data-tour='school-schedule']",
    content: "Set your school hours so Vistari never schedules study sessions during school time.",
  },
  {
    target: "[data-tour='add-event']",
    content: "Add one-time or recurring events. Vistari will automatically adjust your study timetable around these events.",
  },
  {
    target: "[data-tour='events-list']",
    content: "View all your upcoming events and edit them as needed. Changes automatically update your timetable.",
  },
];

export const homeworkTourSteps: Step[] = [
  {
    target: "[data-tour='homework-page']",
    content: "Manage all your homework assignments in one place. Vistari schedules time for each assignment based on due dates.",
    disableBeacon: true,
  },
  {
    target: "[data-tour='add-homework']",
    content: "Add new homework by specifying the subject, title, due date, and estimated duration.",
  },
  {
    target: "[data-tour='active-homework']",
    content: "Your active homework list shows all incomplete assignments sorted by due date.",
  },
  {
    target: "[data-tour='completed-homework']",
    content: "Track your progress! Completed homework moves here so you can see what you've accomplished.",
  },
];

export const testScoresTourSteps: Step[] = [
  {
    target: "[data-tour='tests-page']",
    content: "Track your test scores and get AI-powered analysis to identify strengths, weaknesses, and improvement areas.",
    disableBeacon: true,
  },
  {
    target: "[data-tour='add-test-score']",
    content: "Enter your test results including score, questions you got right/wrong, and subject.",
  },
  {
    target: "[data-tour='test-analysis']",
    content: "AI analyzes your test performance to identify patterns and recommend topics to focus on.",
  },
  {
    target: "[data-tour='test-history']",
    content: "See your test score history and track your improvement over time.",
  },
];

export const aiInsightsTourSteps: Step[] = [
  {
    target: "[data-tour='insights-page']",
    content: "AI Insights analyzes your study patterns to provide personalized recommendations and identify your peak study hours.",
    disableBeacon: true,
  },
  {
    target: "[data-tour='peak-hours']",
    content: "This heatmap shows when you're most productive. Vistari schedules harder topics during your peak hours!",
  },
  {
    target: "[data-tour='analytics']",
    content: "Track your study habits, session completion rates, and focus scores over time.",
  },
  {
    target: "[data-tour='insights-generate']",
    content: "Generate fresh insights to get updated recommendations based on your latest study data.",
  },
];

export const reflectionsTourSteps: Step[] = [
  {
    target: "[data-tour='reflections-page']",
    content: "Reflections help you track how each study session went. This data powers Vistari's personalized timetable adjustments.",
    disableBeacon: true,
  },
  {
    target: "[data-tour='reflection-cards']",
    content: "Each reflection shows your focus level, completion status, and any notes you added about the session.",
  },
  {
    target: "[data-tour='reflection-filters']",
    content: "Filter reflections by date, subject, or topic to identify patterns in your study habits.",
  },
];

export const timetablesTourSteps: Step[] = [
  {
    target: "[data-tour='timetables-page']",
    content: "Your timetables are AI-generated study plans that adapt to your schedule, deadlines, and learning patterns.",
    disableBeacon: true,
  },
  {
    target: "[data-tour='new-timetable']",
    content: "Create a new timetable by selecting subjects, topics, and study preferences. AI handles the rest!",
  },
  {
    target: "[data-tour='timetable-card']",
    content: "Each timetable shows the date range and subjects covered. Click to view details or regenerate for tomorrow.",
  },
  {
    target: "[data-tour='timetable-history']",
    content: "View version history to see how your timetable evolved and revert to previous versions if needed.",
  },
];
