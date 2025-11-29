import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Timetables from "@/pages/Timetables";
import TimetableView from "@/pages/TimetableView";
import CalendarView from "@/pages/CalendarView";
import Social from "@/pages/Social";
import Groups from "@/pages/Groups";
import GroupDetail from "@/components/groups/GroupDetail";
import ImportTimetable from "@/pages/ImportTimetable";
import Events from "@/pages/Events";
import Homework from "@/pages/Homework";
import TestScores from "@/pages/TestScores";
import AIInsights from "@/pages/AIInsights";
import Reflections from "@/pages/Reflections";
import NotFound from "@/pages/NotFound";
import ImportAccount from "@/pages/ImportAccount";
import Admin from "@/pages/Admin";

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/timetables" element={<Timetables />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/social" element={<Social />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/import-timetable" element={<ImportTimetable />} />
        <Route path="/events" element={<Events />} />
        <Route path="/homework" element={<Homework />} />
        <Route path="/test-scores" element={<TestScores />} />
        <Route path="/ai-insights" element={<AIInsights />} />
        <Route path="/reflections" element={<Reflections />} />
        <Route path="/timetable/:id" element={<TimetableView />} />
        <Route path="/import-account" element={<ImportAccount />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
