import { format, differenceInDays, addDays, parseISO, isWithinInterval } from "date-fns";
import { Subject, Topic, TestDate, StudyPreferences } from "@/components/OnboardingWizard";
import { Homework } from "@/components/onboarding/HomeworkStep";

export interface FeasibilityResult {
  status: "over-scheduled" | "balanced" | "under-utilized" | "optimal";
  totalHoursNeeded: number;
  totalAvailableHours: number;
  difference: number;
  breakdown: {
    topics: number;
    homework: number;
    testPrep: number;
  };
  weeklyDistribution: {
    week: string;
    hours: number;
    status: "manageable" | "busy" | "overwhelming";
  }[];
  recommendations: string[];
}

export const calculateFeasibility = (
  subjects: Subject[],
  topics: Topic[],
  testDates: TestDate[],
  preferences: StudyPreferences,
  homeworks: Homework[],
  startDate: string,
  endDate: string,
  events?: any[]
): FeasibilityResult => {
  // Calculate hours needed for topics (based on confidence levels)
  const topicHours = topics.reduce((total, topic) => {
    const confidence = topic.confidence || 5;
    // Lower confidence = more time (up to 90 min), higher confidence = less time (down to 60 min)
    const minutesPerTopic = 90 - (confidence - 1) * 3; // Scale from 90 to 60
    return total + minutesPerTopic / 60;
  }, 0);

  // Calculate homework hours
  const homeworkHours = homeworks.reduce((total, hw) => {
    return total + (hw.duration || 60) / 60; // Convert minutes to hours
  }, 0);

  // Calculate test prep hours (2-3 hours per test)
  const testPrepHours = testDates.length * 2.5;

  const totalHoursNeeded = topicHours + homeworkHours + testPrepHours;

  // Calculate available study hours
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const totalDays = differenceInDays(end, start) + 1;

  // Calculate available hours per week based on day_time_slots
  const enabledSlots = preferences.day_time_slots.filter((slot) => slot.enabled);
  
  let weeklyAvailableHours = 0;
  enabledSlots.forEach((slot) => {
    if (slot.startTime && slot.endTime) {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const slotHours = Math.max(0, (endHour + endMin / 60) - (startHour + startMin / 60));
      weeklyAvailableHours += slotHours;
    }
  });

  // Calculate total available hours across all days
  const weeks = totalDays / 7;
  let totalAvailableHours = weeklyAvailableHours * weeks;

  // Subtract UNIQUE event durations that fall within the timetable range
  if (events && events.length > 0) {
    const uniqueEvents = new Map();
    events.forEach((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      // Only count events within the timetable date range
      if (eventStart >= start && eventStart <= end) {
        const eventKey = `${event.title}-${event.start_time}-${event.end_time}`;
        if (!uniqueEvents.has(eventKey)) {
          const eventDuration = Math.max(0, (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60));
          uniqueEvents.set(eventKey, eventDuration);
        }
      }
    });
    
    // Sum up unique event hours
    uniqueEvents.forEach((duration) => {
      totalAvailableHours -= duration;
    });
  }

  // Ensure available hours never goes negative
  totalAvailableHours = Math.max(0, totalAvailableHours);

  // Calculate weekly distribution
  const weeklyDistribution = [];
  let currentWeekStart = start;
  let weekNumber = 1;

  while (currentWeekStart <= end) {
    const weekEnd = addDays(currentWeekStart, 6);
    const actualWeekEnd = weekEnd > end ? end : weekEnd;
    
    // Calculate hours for this week
    const daysInWeek = differenceInDays(actualWeekEnd, currentWeekStart) + 1;
    const weeksInPeriod = daysInWeek / 7;
    let weekHours = weeklyAvailableHours * weeksInPeriod;

    // Subtract UNIQUE events in this week
    if (events) {
      const uniqueWeekEvents = new Map();
      events.forEach((event) => {
        const eventDate = new Date(event.start_time);
        if (
          isWithinInterval(eventDate, {
            start: currentWeekStart,
            end: actualWeekEnd,
          })
        ) {
          const eventKey = `${event.title}-${event.start_time}-${event.end_time}`;
          if (!uniqueWeekEvents.has(eventKey)) {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const eventDuration = Math.max(0, (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60));
            uniqueWeekEvents.set(eventKey, eventDuration);
          }
        }
      });
      
      uniqueWeekEvents.forEach((duration) => {
        weekHours -= duration;
      });
    }

    // Ensure week hours never goes negative
    weekHours = Math.max(0, weekHours);

    // Estimate hours needed per week (distribute evenly)
    const estimatedHoursNeeded = (totalHoursNeeded / weeks) * weeksInPeriod;
    const utilization = weekHours > 0 ? estimatedHoursNeeded / weekHours : 0;

    let status: "manageable" | "busy" | "overwhelming";
    if (utilization < 0.6) status = "manageable";
    else if (utilization < 0.85) status = "busy";
    else status = "overwhelming";

    weeklyDistribution.push({
      week: `Week ${weekNumber}`,
      hours: Math.round(estimatedHoursNeeded * 10) / 10,
      status,
    });

    currentWeekStart = addDays(currentWeekStart, 7);
    weekNumber++;
  }

  // Determine overall status
  const difference = totalAvailableHours - totalHoursNeeded;
  const utilization = totalAvailableHours > 0 ? totalHoursNeeded / totalAvailableHours : 1;

  let status: "over-scheduled" | "balanced" | "under-utilized" | "optimal";
  if (utilization > 1.05) status = "over-scheduled";
  else if (utilization > 0.95) status = "optimal";
  else if (utilization > 0.7) status = "balanced";
  else status = "under-utilized";

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (status === "over-scheduled") {
    const daysNeeded = Math.ceil(Math.abs(difference) / (weeklyAvailableHours / 7));
    recommendations.push(`Consider extending end date by ${daysNeeded} days to fit all work comfortably`);
    recommendations.push(`Alternatively, reduce topics by focusing on high-priority items first`);
    recommendations.push(`You could also increase daily study hours if possible`);
  } else if (status === "under-utilized") {
    recommendations.push(`You have ${Math.round(difference)} extra hours available`);
    recommendations.push(`Consider adding more revision sessions or practice questions`);
    recommendations.push(`This is a great opportunity to deepen your understanding of difficult topics`);
  } else if (status === "optimal" || status === "balanced") {
    recommendations.push(`Your schedule looks achievable! Well balanced across the time period`);
    recommendations.push(`Make sure to stick to your planned study times for best results`);
  }

  // Check for overwhelming weeks
  const overwhelmingWeeks = weeklyDistribution.filter((w) => w.status === "overwhelming");
  if (overwhelmingWeeks.length > 0) {
    recommendations.push(`${overwhelmingWeeks.length} week(s) look particularly heavy - consider spreading work more evenly`);
  }

  return {
    status,
    totalHoursNeeded: Math.round(totalHoursNeeded * 10) / 10,
    totalAvailableHours: Math.round(totalAvailableHours * 10) / 10,
    difference: Math.round(difference * 10) / 10,
    breakdown: {
      topics: Math.round(topicHours * 10) / 10,
      homework: Math.round(homeworkHours * 10) / 10,
      testPrep: Math.round(testPrepHours * 10) / 10,
    },
    weeklyDistribution,
    recommendations,
  };
};
