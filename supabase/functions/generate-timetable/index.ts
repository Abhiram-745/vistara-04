import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema - accept both UUID and string subject_ids for backward compatibility
const inputSchema = z.object({
  subjects: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().max(100),
    exam_board: z.string().max(50),
    mode: z.enum(["short-term-exam", "long-term-exam", "no-exam"]).optional().default("no-exam")
  })).max(20),
  topics: z.array(z.object({
    name: z.string().max(200),
    subject_id: z.string().max(100) // Accept any string, not just UUID for backward compatibility
  })).max(500),
  testDates: z.array(z.object({
    subject_id: z.string().max(100), // Accept any string for backward compatibility
    test_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    test_type: z.string().max(50)
  })).max(50),
  preferences: z.object({
    daily_study_hours: z.number().min(0).max(12),
    day_time_slots: z.array(z.object({
      day: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      enabled: z.boolean()
    })),
    session_duration: z.number().min(15).max(180),
    break_duration: z.number().min(5).max(60),
    duration_mode: z.enum(["fixed", "flexible"]),
    aiNotes: z.string().optional(),
    study_before_school: z.boolean().optional(),
    study_during_lunch: z.boolean().optional(),
    study_during_free_periods: z.boolean().optional(),
    before_school_start: z.string().optional(),
    before_school_end: z.string().optional(),
    lunch_start: z.string().optional(),
    lunch_end: z.string().optional()
  }),
  homeworks: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string(),
    subject: z.string(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    duration: z.number().optional().nullable(),
    description: z.string().optional().nullable()
  })).optional(),
  topicAnalysis: z.object({
    priorities: z.array(z.object({
      topic_name: z.string(),
      priority_score: z.number(),
      reasoning: z.string()
    })).optional(),
    difficult_topics: z.array(z.object({
      topic_name: z.string(),
      reason: z.string(),
      study_suggestion: z.string()
    })).optional()
  }).nullable().optional(),
  aiNotes: z.string().optional(),
  events: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().optional().nullable(),
    start_time: z.string(),
    end_time: z.string()
  })).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timetableMode: z.enum(["short-term-exam", "long-term-exam", "no-exam"]).nullable().optional()
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input data
    const requestBody = await req.json();
    const parsed = inputSchema.safeParse(requestBody);
    
    if (!parsed.success) {
      console.error('Validation error:', parsed.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data',
      details: parsed.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subjects, topics, testDates, preferences, startDate, endDate, homeworks = [], topicAnalysis, aiNotes, events: rawEvents = [], timetableMode } = parsed.data;

    const events = Array.from(
      new Map(rawEvents.map((evt: any) => [
        `${evt.title}-${evt.start_time}-${evt.end_time}-${evt.id}`,
        evt,
      ])).values()
    );

    // Fetch existing study insights for peak hours analysis
    let peakHoursContext = "";
    try {
      const { data: insightsData } = await supabaseClient
        .from('study_insights')
        .select('insights_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (insightsData?.insights_data?.peakStudyHours) {
        const peak = insightsData.insights_data.peakStudyHours;
        peakHoursContext = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 PEAK STUDY HOURS - PERSONALIZED SCHEDULING 🧠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on this user's past performance:

✅ BEST PERFORMANCE: ${peak.bestTimeWindow.toUpperCase()} (${peak.bestTimeRange})
   - Completion Rate: ${(peak.completionRateByWindow[peak.bestTimeWindow] * 100).toFixed(0)}%
   - Avg Difficulty Handled: ${peak.avgDifficultyByWindow[peak.bestTimeWindow]?.toFixed(1)}/10

❌ MOST CHALLENGING: ${peak.worstTimeWindow.toUpperCase()} (${peak.worstTimeRange})
   - Completion Rate: ${(peak.completionRateByWindow[peak.worstTimeWindow] * 100).toFixed(0)}%
   - Avg Difficulty Handled: ${peak.avgDifficultyByWindow[peak.worstTimeWindow]?.toFixed(1)}/10

📊 SMART SCHEDULING STRATEGY:
${peak.recommendation}

**CRITICAL SCHEDULING RULES BASED ON PEAK HOURS:**
✓ Schedule DIFFICULT/HIGH-PRIORITY topics during ${peak.bestTimeWindow.toUpperCase()} hours
✓ Schedule EASIER/REVIEW topics during ${peak.worstTimeWindow.toUpperCase()} hours
✓ Place topics with difficulty rating 7-10 during peak performance times
✓ Place topics with difficulty rating 1-4 during lower performance times
✓ If user has high completion rates in ${peak.bestTimeWindow}, load more intensive work then

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      }
    } catch (error) {
      console.log('No existing insights found, proceeding without peak hours data');
    }

    console.log("Generating timetable with:", {
      subjectsCount: subjects.length,
      topicsCount: topics.length,
      testDatesCount: testDates.length,
      homeworksCount: homeworks.length,
      eventsCount: events.length,
      hasAnalysis: !!topicAnalysis,
      hasPeakHours: !!peakHoursContext,
      dateRange: `${startDate} to ${endDate}`,
    });

    const subjectsContext = subjects
      .map((s: any) => {
        const modeLabel = s.mode === "short-term-exam" ? "Short-Term Exam Prep" 
          : s.mode === "long-term-exam" ? "Long-Term Exam Prep" 
          : "No Exam Focus";
        return `${s.name} (${s.exam_board}) - MODE: ${modeLabel}`;
      })
      .join("; ");
    
    // Fetch school schedule from study preferences
    let schoolHoursContext = "";
    try {
      const { data: schoolPrefs } = await supabaseClient
        .from('study_preferences')
        .select('school_start_time, school_end_time, study_before_school, study_during_lunch, study_during_free_periods, before_school_start, before_school_end, lunch_start, lunch_end')
        .eq('user_id', user.id)
        .single();
      
      if (schoolPrefs) {
        const hasSchoolHours = schoolPrefs.school_start_time && schoolPrefs.school_end_time;
        if (hasSchoolHours) {
          schoolHoursContext = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏫 SCHOOL HOURS BLOCKING - ABSOLUTE PRIORITY 🏫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL: User attends school during these times EVERY WEEKDAY:
   Leave for school: ${schoolPrefs.school_start_time}
   Return from school: ${schoolPrefs.school_end_time}

🚫 MANDATORY BLOCKING RULES - STRICTLY ENFORCED:
1. ❌ NEVER schedule ANY study sessions between ${schoolPrefs.school_start_time} and ${schoolPrefs.school_end_time} on weekdays (Mon-Fri)
2. ❌ This time is COMPLETELY UNAVAILABLE - treat like a daily recurring event
3. ✅ Only schedule BEFORE ${schoolPrefs.school_start_time} OR AFTER ${schoolPrefs.school_end_time}
4. ✅ Weekends (Saturday, Sunday) are NOT affected by school hours

🔒 USER PREFERENCE FLAGS (RESPECT THESE STRICTLY):
${schoolPrefs.study_before_school === true ? `✅ BEFORE SCHOOL ENABLED: User wants sessions before school (${schoolPrefs.before_school_start} - ${schoolPrefs.before_school_end})
   - You MAY schedule SHORT homework sessions (15-25 mins) in this time slot
   - ONLY homework, never revision/exam prep` : `❌ BEFORE SCHOOL DISABLED: User does NOT want any sessions before school
   - DO NOT schedule anything before ${schoolPrefs.school_start_time} on weekdays
   - Leave this time completely empty`}

${schoolPrefs.study_during_lunch === true ? `✅ LUNCH TIME ENABLED: User wants sessions during lunch (${schoolPrefs.lunch_start} - ${schoolPrefs.lunch_end})
   - You MAY schedule SHORT homework sessions (15-20 mins) during lunch
   - ONLY homework, never revision/exam prep` : `❌ LUNCH TIME DISABLED: User does NOT want any sessions during lunch
   - DO NOT schedule anything during lunch hours
   - Lunch time is break time, not study time`}

${schoolPrefs.study_during_free_periods === true ? `✅ FREE PERIODS ENABLED: User wants short homework during free periods at school
   - You MAY add SHORT homework sessions during school hours (15-25 mins)
   - ONLY homework, never revision/exam prep` : `❌ FREE PERIODS DISABLED: User does NOT want any sessions during school
   - DO NOT schedule anything during ${schoolPrefs.school_start_time} - ${schoolPrefs.school_end_time}
   - School time is completely off-limits for study`}

🎯 CRITICAL SUMMARY:
${!schoolPrefs.study_before_school && !schoolPrefs.study_during_lunch && !schoolPrefs.study_during_free_periods 
  ? `⚠️ ALL SCHOOL-TIME STUDY DISABLED ⚠️
     The user has explicitly disabled ALL school-time study options.
     DO NOT schedule ANYTHING before school, during school, or during lunch.
     ONLY schedule AFTER ${schoolPrefs.school_end_time} on weekdays.` 
  : `⚠️ SOME SCHOOL-TIME STUDY ENABLED ⚠️
     Respect the enabled flags above - only schedule in explicitly enabled time slots.
     All other school time remains COMPLETELY BLOCKED.`}

🏫 REMEMBER: School hours are BLOCKED unless explicitly enabled! 🏫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        }
      }
    } catch (error) {
      console.log('No school schedule found, proceeding without school hours blocking');
    }
    
    const topicsContext = topics
      .map((t: any) => {
        const subject = subjects.find((s: any) => s.id === t.subject_id);
        const relatedTests = testDates.filter((td: any) => td.subject_id === t.subject_id);
        const testInfo = relatedTests.length > 0 
          ? ` - TEST DATE: ${relatedTests[0].test_date}` 
          : '';
        return `${t.name} (${subject?.name}${testInfo})`;
      })
      .join("; ");
    
    const testsContext = testDates
      .map((td: any) => {
        const subject = subjects.find((s: any) => s.id === td.subject_id);
        return `${subject?.name} ${td.test_type} on ${td.test_date}`;
      })
      .join("; ");

    // Filter homework to only include items that can be scheduled at least 1 day before due date
    const relevantHomework = homeworks.filter((hw: any) => {
      const dueDate = new Date(hw.due_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Homework must be due within the timetable range
      if (dueDate < start || dueDate > end) return false;
      
      // Calculate the latest possible scheduling date (1 day before due date)
      const latestScheduleDate = new Date(dueDate);
      latestScheduleDate.setDate(latestScheduleDate.getDate() - 1);
      
      // Only include homework if we have at least 1 day before the due date to schedule it
      return latestScheduleDate >= start;
    });

    const homeworksContext = relevantHomework.length > 0 
      ? "\n\n**HOMEWORK ASSIGNMENTS (ALL MUST BE SCHEDULED - MANDATORY):**\n" + relevantHomework
          .map((hw: any) => {
            const dueDate = new Date(hw.due_date);
            const formattedDueDate = dueDate.toISOString().split('T')[0];
            const dueTime = dueDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const daysUntilDue = Math.ceil((dueDate.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
            return `- "${hw.title}" (${hw.subject}) - DUE: ${formattedDueDate} at ${dueTime}, DURATION: ${hw.duration || 60} minutes - Days until due: ${daysUntilDue} - 🚨 MUST SCHEDULE ${Math.max(1, daysUntilDue - 2)} DAYS BEFORE DUE DATE - NEVER SCHEDULE ON ${formattedDueDate}`;
          })
          .join("\n") + 
          `\n\n**🚨 ABSOLUTE HOMEWORK DEADLINE REQUIREMENTS 🚨**: 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. You MUST schedule ALL ${relevantHomework.length} homework assignments listed above
2. 🔴 CRITICAL: Homework MUST be completed BEFORE the due date - NEVER ON the due date
3. Homework is submitted/handed in on the due date, so it must be DONE BEFORE THEN
4. If homework is due on 2024-01-15, it MUST be scheduled on 2024-01-14 or earlier (preferably 2024-01-13 or 2024-01-12)
5. IDEAL: Schedule homework 2-3 days before the due date for best time management
6. MINIMUM: Schedule at least 1 full day before the due date (never on the due date itself)
7. **PRIORITY BY DUE DATE**: Schedule homework with sooner due dates FIRST to avoid last-minute cramming
8. **ALLOCATE EXACT DURATION**: Each homework session must be scheduled with its EXACT specified duration (${relevantHomework.map((hw: any) => `${hw.title}: ${hw.duration || 60} mins`).join(', ')})
9. Count and verify you've created exactly ${relevantHomework.length} homework sessions
10. Each homework session MUST be scheduled with enough time to complete before due date
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : "\n\nNo homework assignments";

    const enabledDays = preferences.day_time_slots
      .filter((slot: any) => slot.enabled)
      .map((slot: any) => `${slot.day} (${slot.startTime}-${slot.endTime})`)
      .join(", ");

    // Add priority analysis context if available - FOCUS topics get SIGNIFICANTLY MORE study time with MULTIPLE sessions
    // VARIABLE DURATIONS: Priority score determines session length (higher priority = longer sessions)
    // Formula: 30 + (priority_score * 6) = duration in minutes
    // Priority 10 = 90 mins, Priority 5 = 60 mins, Priority 1 = 36 mins
    const calculatePriorityDuration = (priorityScore: number, isFixedMode: boolean, baseDuration: number) => {
      if (isFixedMode) return baseDuration; // Fixed mode uses user's exact duration
      // Variable duration based on priority: higher priority = more intensive/longer sessions
      return Math.min(90, Math.max(30, 30 + (priorityScore * 6)));
    };
    
    // RESPECT the user's duration mode when calculating focus topic durations
    const focusSessionDuration = preferences.duration_mode === "fixed" 
      ? preferences.session_duration 
      : (timetableMode === "short-term-exam" ? 75 : timetableMode === "long-term-exam" ? 55 : 45);
    
    const priorityContext = topicAnalysis?.priorities 
      ? "\n\n**FOCUS TOPICS WITH CALCULATED DURATIONS** (use EXACT durations shown - higher priority = longer sessions):\n" + 
        topicAnalysis.priorities
          .sort((a: any, b: any) => b.priority_score - a.priority_score)
          .map((p: any) => {
            const calculatedDuration = calculatePriorityDuration(p.priority_score, preferences.duration_mode === "fixed", preferences.session_duration);
            const sessions = Math.max(4, Math.ceil(p.priority_score / 1.5));
            return `📌 ${p.topic_name}: Priority ${p.priority_score}/10
   → USER'S STRUGGLES: "${p.reasoning}"
   → CALCULATED DURATION: ${calculatedDuration} minutes per session (based on priority score)
   → NUMBER OF SESSIONS: ${sessions} sessions throughout the timetable
   → WHY THIS DURATION: Priority ${p.priority_score} × 6 + 30 = ${calculatedDuration} mins (more struggle = more time)`;
          })
          .join("\n\n")
      : "";

    const difficultTopicsContext = topicAnalysis?.difficult_topics 
      ? "\n\n**ADDITIONAL FOCUS CONTEXT** (allocate extra time and multiple sessions):\n" + 
        topicAnalysis.difficult_topics
          .map((dt: any) => {
            const estimatedPriority = 7; // Default high priority for difficult topics
            const calculatedDuration = calculatePriorityDuration(estimatedPriority, preferences.duration_mode === "fixed", preferences.session_duration);
            return `${dt.topic_name}: ${dt.reason}\nStudy Suggestion: ${dt.study_suggestion}\n  → Calculated duration: ${calculatedDuration} minutes each`;
          })
          .join("\n")
      : "";

    const userNotesContext = aiNotes 
      ? `\n\n**USER'S CUSTOM INSTRUCTIONS** (MUST FOLLOW THESE REQUIREMENTS):\n${aiNotes}\n`
      : "";

    // Client-side school study preferences - these override database values
    const clientSchoolPrefsContext = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏫 CLIENT-SIDE SCHOOL PREFERENCES (from user's current session) 🏫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${preferences.study_before_school === true ? `✅ BEFORE SCHOOL STUDY ENABLED
   Time window: ${preferences.before_school_start || '07:00'} - ${preferences.before_school_end || '08:30'}
   → You MAY schedule SHORT homework sessions (15-25 mins) in this time slot
   → ONLY homework, never intensive revision/exam prep` : `❌ BEFORE SCHOOL STUDY DISABLED
   → DO NOT schedule anything during the morning before school
   → This time is completely off-limits`}

${preferences.study_during_lunch === true ? `✅ LUNCH TIME STUDY ENABLED
   Time window: ${preferences.lunch_start || '12:00'} - ${preferences.lunch_end || '13:00'}
   → You MAY schedule SHORT homework sessions (15-20 mins) during lunch
   → ONLY homework, never intensive revision` : `❌ LUNCH TIME STUDY DISABLED
   → DO NOT schedule anything during lunch hours
   → Lunch time is break time, not study time`}

${preferences.study_during_free_periods === true ? `✅ FREE PERIODS STUDY ENABLED
   → You MAY add SHORT homework sessions during free periods at school (15-25 mins)
   → ONLY homework, never intensive revision` : `❌ FREE PERIODS STUDY DISABLED
   → DO NOT schedule anything during school hours
   → School time is completely off-limits for study`}

These preferences take priority over any database-stored values.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Variable duration instructions for flexible mode
    const variableDurationInstructions = preferences.duration_mode === "flexible" ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📏 VARIABLE DURATION FORMULA (MANDATORY IN FLEXIBLE MODE) 📏
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For FOCUS TOPICS (from priority analysis), calculate session duration:
   Duration = 30 + (priority_score × 6) minutes

DURATION EXAMPLES BY PRIORITY:
• Priority 10 topic → 30 + (10 × 6) = 90 minutes per session (MAXIMUM - most intensive)
• Priority 8 topic  → 30 + (8 × 6) = 78 minutes per session
• Priority 6 topic  → 30 + (6 × 6) = 66 minutes per session
• Priority 5 topic  → 30 + (5 × 6) = 60 minutes per session
• Priority 4 topic  → 30 + (4 × 6) = 54 minutes per session
• Priority 2 topic  → 30 + (2 × 6) = 42 minutes per session
• Priority 1 topic  → 30 + (1 × 6) = 36 minutes per session (MINIMUM for focus topics)

NON-FOCUS TOPICS (topics NOT in the priority list):
• Regular topics: 35-45 minutes per session
• Easy review topics: 25-35 minutes per session

🎯 HIGH PRIORITY = LONGER SESSIONS (the user struggles more, needs more time)
🎯 LOW PRIORITY = SHORTER SESSIONS (the user is more confident, needs less time)

USER'S DIFFICULTY NOTES - THESE EXPLAIN WHY THEY STRUGGLE:
${topicAnalysis?.priorities?.map((p: any) => `• ${p.topic_name}: "${p.reasoning}" → Priority ${p.priority_score}/10`).join('\n') || 'No specific difficulty notes provided'}

The AI analyzed these struggles and assigned priority scores accordingly.
USE THE CALCULATED DURATIONS ABOVE - DO NOT use flat durations for focus topics!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : '';

    const eventsContext = events.length > 0
      ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 BLOCKED EVENT TIMES - ABSOLUTE NO-SCHEDULE ZONES 🔴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL: These events are ONLY for BLOCKING time - DO NOT include them in your generated schedule!
⚠️ Events like "Badminton", "Football", etc. are USER COMMITMENTS that block study time
⚠️ DO NOT generate study sessions with these event names - they are already scheduled by the user!

These time slots are COMPLETELY UNAVAILABLE for study sessions:

${events.map((evt: any) => {
  const startDate = new Date(evt.start_time);
  const endDate = new Date(evt.end_time);
  const durationMins = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  return `⛔ BLOCKED TIME: ${evt.title}
   📅 Date: ${startDate.toLocaleDateString()}
   ⏰ Time: ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} → ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
   ⏱️  Duration: ${durationMins} minutes BLOCKED
   ${evt.description ? `📝 ${evt.description}` : ''}
   🚫 DO NOT CREATE ANY STUDY SESSIONS DURING THIS TIME
   ⚠️  SKIP FROM ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} TO ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
}).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CRITICAL EVENT BLOCKING RULES - MUST FOLLOW EXACTLY:**

🚫 WHAT YOU MUST NOT DO:
✗ DO NOT create study sessions with event names (e.g., "Badminton", "Football")
✗ DO NOT schedule anything during blocked times
✗ If event is 18:00-21:00 (180 mins), the ENTIRE 3-hour block is BLOCKED
✗ You cannot schedule at 18:00, 18:15, 18:30, 19:00, 19:30, 20:00, 20:30, 20:45

✓ WHAT YOU MUST DO:
✓ ONLY schedule study sessions for TOPICS and HOMEWORK from the provided lists
✓ Skip over event times completely - leave them empty in your schedule
✓ Next available time slot after 18:00-21:00 event is 21:00 or later
✓ Schedule work BEFORE event starts OR AFTER event ends
✓ Events take ABSOLUTE PRIORITY over all study activities
✓ **RESUME SCHEDULING AFTER EVENTS END**: After an event finishes, you MUST continue scheduling study sessions until the user's requested end time
✓ Example: If event ends at 21:00 and user wants to study until 23:00, schedule 2 hours of work from 21:00-23:00
✓ **FILL THE ENTIRE DAY**: Events create gaps, but you must fill the time BEFORE and AFTER events

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      : "";

    // Timetable mode context - adjust scheduling strategy based on mode
    const getModeContext = (mode: string | null | undefined) => {
      switch (mode) {
        case "short-term-exam":
          return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TIMETABLE MODE: SHORT-TERM EXAM PREP (INTENSIVE) 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 INTENSIVE EXAM FOCUS - CRUNCH TIME MODE

MANDATORY SCHEDULING RULES (FLEXIBLE MODE):
✓ Revision Session Duration: 60-90 minutes per topic (LONGER intensive sessions)
✓ Break Duration: 5-10 minutes only (SHORT breaks to maximize study time)
✓ Daily Sessions: 4-6 intensive study sessions per day
✓ Repeat Frequency: Review SAME topics every 2-3 days (aggressive repetition)
✓ Homework: ONLY schedule urgent homework within 2 days of due date
✓ Revision Priority: Schedule 75% REVISION sessions, 25% homework max
✓ Session Types: Heavy focus on EXAM QUESTIONS and PAST PAPERS
✓ Topic Coverage: Focus on HIGH-PRIORITY exam topics, revisit frequently

TIME ALLOCATION TARGETS:
- 75% of daily time = Exam revision & practice
- 25% of daily time = Critical homework only
- Schedule MULTIPLE sessions per difficult topic each week
- Prioritize topics appearing on upcoming exams

EXAM PREP INTENSITY:
- Each difficult topic should appear 3-4+ times before exam
- Back-to-back study sessions are ACCEPTABLE (minimal breaks)
- Focus on depth over breadth - master exam topics thoroughly
- Daily exam question practice is MANDATORY

⚡ THIS IS INTENSIVE EXAM MODE - MAXIMIZE REVISION TIME! ⚡
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        case "long-term-exam":
          return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 TIMETABLE MODE: LONG-TERM EXAM PREP (BALANCED) ⚖️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 BALANCED APPROACH - STEADY PROGRESS MODE

MANDATORY SCHEDULING RULES (FLEXIBLE MODE):
✓ Revision Session Duration: 45-60 minutes per topic (MODERATE length sessions)
✓ Break Duration: 10-15 minutes (REGULAR breaks for sustainability)
✓ Daily Sessions: 3-4 balanced study sessions per day
✓ Repeat Frequency: Review topics every 5-7 days (spaced repetition)
✓ Homework: Schedule ALL homework assignments comfortably
✓ Revision Priority: Schedule 50% REVISION, 50% HOMEWORK (equal split)
✓ Session Types: Mix of practice, revision notes, and exam questions
✓ Topic Coverage: Gradual, comprehensive coverage of all topics

TIME ALLOCATION TARGETS:
- 50% of daily time = Revision & exam practice
- 50% of daily time = Homework assignments
- Spread topics evenly across the timetable period
- Allow adequate time for understanding and practice

STEADY LEARNING APPROACH:
- Each topic revisited 2-3 times over the study period
- Regular breaks prevent burnout
- Mix difficult and easier topics throughout week
- Build solid foundations with consistent daily work

⚖️ BALANCED MODE - SUSTAINABLE STUDY HABITS! ⚖️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        case "no-exam":
          return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 TIMETABLE MODE: NO EXAM FOCUS (GETTING AHEAD) 📚
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 GET AHEAD ON SUBJECTS - GENERAL LEARNING MODE

MANDATORY SCHEDULING RULES (FLEXIBLE MODE):
✓ Priority Order: HOMEWORK FIRST, then general subject revision
✓ Homework: Schedule ALL homework assignments (mandatory completion)
✓ Revision Session Duration: 45-60 minutes per topic (STANDARD learning sessions)
✓ Break Duration: 15 minutes (regular breaks)
✓ Daily Sessions: 3-4 sessions per day
✓ Repeat Frequency: Review topics every 7-10 days (general reinforcement)
✓ Session Types: General revision notes, practice, understanding concepts
✓ Topic Coverage: Broad coverage to get ahead - not exam-focused, just general learning
✓ NO exam pressure: Focus on understanding and getting ahead at comfortable pace

TIME ALLOCATION STRATEGY:
1. FIRST: Complete ALL homework assignments (these are mandatory)
2. THEN: Use remaining available time for general subject revision
3. Revision is about getting ahead on topics, not exam prep
4. Study sessions focus on understanding concepts thoroughly
5. No urgency - steady progress through subject material

BALANCED LEARNING APPROACH:
- Homework always gets scheduled first (must be done)
- Spare time after homework = getting ahead on the subject
- Topics reviewed regularly for general understanding (not exam cramming)
- Standard session lengths for proper learning (not rushed)
- Focus is on broad understanding, not test performance
- Build solid foundations across all topics at steady pace

PHILOSOPHY:
"Complete your homework, then use free time to genuinely understand 
and get ahead on subject material - no exam stress, just learning."

📝 GET AHEAD MODE - HOMEWORK FIRST, THEN GENERAL LEARNING! 📝
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
        default:
          return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 TIMETABLE MODE: BALANCED (DEFAULT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCHEDULING STRATEGY:
✓ Balanced approach between homework and revision
✓ Standard session lengths (45-60 minutes)
✓ Moderate spaced repetition (review every 5-7 days)
✓ Equal priority to homework and topic mastery
✓ Allocate 50% time to revision, 50% to homework

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      }
    };

    const modeContext = getModeContext(timetableMode);

    // Build STRICT time window context - this is the most critical constraint
    const enabledTimeSlots = preferences.day_time_slots.filter((slot: any) => slot.enabled);
    
    // Calculate the actual session and break durations to use
    const actualSessionDuration = preferences.duration_mode === "fixed" 
      ? preferences.session_duration 
      : (timetableMode === "short-term-exam" ? 75 : timetableMode === "long-term-exam" ? 55 : 45);
    const actualBreakDuration = preferences.duration_mode === "fixed"
      ? preferences.break_duration
      : (timetableMode === "short-term-exam" ? 8 : timetableMode === "long-term-exam" ? 12 : 15);
    
    // Get the first enabled slot for examples
    const firstSlot = enabledTimeSlots[0] || { day: 'monday', startTime: '09:00', endTime: '17:00' };
    
    const strictTimeWindowContext = `
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
🚨 ABSOLUTE RULE #1 - PER-DAY TIME WINDOWS (READ THIS FIRST!) 🚨
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

⚠️ EACH DAY HAS ITS OWN TIME WINDOW - RESPECT THEM INDIVIDUALLY! ⚠️

${enabledTimeSlots.map((slot: any) => {
  const dayName = slot.day.charAt(0).toUpperCase() + slot.day.slice(1);
  return `📅 ${dayName.toUpperCase()}: ${slot.startTime} to ${slot.endTime}
   🟢 FIRST session on ${dayName}: MUST start at ${slot.startTime} or later
   🔴 LAST session on ${dayName}: MUST finish by ${slot.endTime}
   ❌ FORBIDDEN on ${dayName}: ANY session before ${slot.startTime}
   ❌ FORBIDDEN on ${dayName}: ANY session ending after ${slot.endTime}
   
   ✅ EXAMPLE SCHEDULE FOR ${dayName.toUpperCase()} (${slot.startTime}-${slot.endTime}):
      "${slot.startTime}" → First session (${actualSessionDuration} mins)
      Break (${actualBreakDuration} mins)
      Next session...
      ...continue until ${slot.endTime}...`;
}).join('\n\n')}

⚠️ CRITICAL: Different days have DIFFERENT time windows! ⚠️
- Monday might be 09:00-17:00
- Saturday might be 10:00-15:00
- Always check THAT DAY'S specific start/end time before scheduling!

❌❌❌ SESSIONS OUTSIDE TIME WINDOWS WILL BE AUTOMATICALLY DELETED ❌❌❌
For each day, we validate:
1. Session start time >= that day's startTime
2. Session end time (start + duration) <= that day's endTime
Sessions failing validation are REMOVED from the schedule!

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
`;

    const prompt = `You are generating a personalized revision timetable for a GCSE student.

**CRITICAL PRINCIPLE: PERSONALIZATION NOT ASSUMPTIONS**

Use ONLY the preferences and data from this student's timetable creation, including:
✓ Days the student is available for study
✓ Start and end times for when they want to study each day
✓ Total study hours or target per day/week
✓ Subjects, topics and exam dates
✓ Topic difficulty / focus list / priority topics
✓ Any days marked as rest or busy (events, homework, exams)

**DO NOT assume every study session is 75 minutes.**

Instead, customize the length and NUMBER of sessions per day based on:
• User's preferred session length (from preferences)
• Total available time that day (end time - start time - events)
• Topic difficulty (harder topics = longer or more frequent blocks)
• Upcoming deadlines and exam proximity
• Focus list topics that should receive more time

**MUST ENSURE:**
✓ Timetable never schedules outside the user's chosen time window
✓ Total scheduled study time per day does NOT exceed their available time
✓ Focus/priority topics appear MORE OFTEN than non-priority topics
✓ Sessions are in realistic blocks (25-90 minutes with reasonable gaps)
✓ All output is clearly structured with date, start time, end time, subject, topic, and notes

${strictTimeWindowContext}

${variableDurationInstructions}

${modeContext}
${schoolHoursContext}
${clientSchoolPrefsContext}
${peakHoursContext}

SUBJECTS: ${subjectsContext}

⚠️ CRITICAL: EACH SUBJECT HAS ITS OWN STUDY MODE ⚠️

Some subjects are set to "Short-Term Exam Prep" (intensive, 1-4 weeks), some to "Long-Term Exam Prep" (balanced, 5-8+ weeks), and some to "No Exam Focus" (getting ahead on topics). 

**PER-SUBJECT MODE HANDLING:**
- Short-Term Exam Prep subjects: Allocate 60-90 min sessions, schedule frequently (every 2-3 days), prioritize exam practice
- Long-Term Exam Prep subjects: Allocate 45-60 min sessions, schedule moderately (every 3-5 days), balanced revision
- No Exam Focus subjects: Allocate 45-60 min sessions for general learning, homework first then use spare time for getting ahead on topics

The overall timetable mode (${timetableMode}) sets the baseline intensity, but ADJUST each subject's scheduling based on its individual mode shown above.

**ALL TOPICS TO COVER** (schedule ALL of these topics in the timetable): ${topicsContext}

UPCOMING TESTS: ${testsContext}

${testDates.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TEST PREPARATION PRIORITY - CRITICAL 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ SUBJECTS WITH UPCOMING TESTS REQUIRE MAXIMUM PRIORITY ⚠️

MANDATORY TEST PREPARATION RULES:
1. **INTENSIVE FOCUS**: Subjects with tests need 2-3x MORE study sessions than subjects without tests
2. **INCREASED SESSION TIME**: Test subjects get LONGER sessions (60-90 minutes each in flexible mode)
3. **FREQUENT REPETITION**: Test topics should appear every 2-3 days leading up to exam
4. **EXAM-STYLE PRACTICE**: 70% of test subject sessions should be exam questions/past papers
5. **PEAK HOURS SCHEDULING**: When peak study hours data is available, schedule test subjects during BEST performance times
6. **FINAL WEEK INTENSITY**: In the 7 days before each test:
   - Schedule test subject DAILY (minimum 1 session per day)
   - Increase to 90-minute intensive sessions where possible
   - Focus entirely on exam questions and past papers
   - Review all topic areas covered in that test

TEST-SPECIFIC ALLOCATION TARGETS:
- If 3 subjects with tests + 7 subjects without tests = 10 total subjects:
  → Test subjects should get ~60% of total revision time
  → Non-test subjects share remaining 40%
- Each test subject should have MINIMUM 8-12 revision sessions across the timetable
- Non-test subjects can have 3-5 sessions each

EXAM DAY PREPARATION:
- 2 days before test: Final comprehensive review (all topics)
- 1 day before test: Light review + exam strategy practice
- Test day: COMPLETELY BLOCKED (no sessions)

🎯 REMEMBER: Tests are THE PRIORITY - allocate study time accordingly! 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

HOMEWORK ASSIGNMENTS: ${homeworksContext}
${priorityContext}
${difficultTopicsContext}
${userNotesContext}
${eventsContext}

STUDY PREFERENCES:
- Daily study hours target: ${preferences.daily_study_hours}
- Available study times per day: ${enabledDays}
- Duration mode: ${preferences.duration_mode === "fixed" ? "FIXED - Use exact durations specified below" : "FLEXIBLE - Vary durations intelligently based on task type"}
${preferences.duration_mode === "fixed" 
  ? `- Fixed session duration: ${preferences.session_duration} minutes (MUST use this exact duration for all study sessions)\n- Fixed break duration: ${preferences.break_duration} minutes (MUST use this exact duration for all breaks)` 
  : `- Default session duration: ${preferences.session_duration} minutes (guideline only - adjust intelligently)\n- Default break duration: ${preferences.break_duration} minutes (guideline only - adjust intelligently)`}

**CRITICAL: Session duration rules based on DURATION MODE and TIMETABLE MODE:**

${preferences.duration_mode === "fixed" 
  ? `**🔒 FIXED DURATION MODE - USE USER'S EXACT SPECIFICATIONS:**
- ALL revision sessions: EXACTLY ${preferences.session_duration} minutes (user's choice)
- ALL homework sessions: Use exact specified duration from homework list
- ALL breaks: EXACTLY ${preferences.break_duration} minutes (user's choice)
- DO NOT adjust durations based on timetable mode - user wants fixed lengths
- Respect user's preferences over timetable mode suggestions`
  : timetableMode === "short-term-exam"
  ? `**🔥 FLEXIBLE + SHORT-TERM EXAM MODE (INTENSIVE):**
- Revision sessions: 60-90 minutes (LONG intensive sessions)
- Homework: Only if urgent, use exact specified duration
- Breaks: 5-10 minutes only (SHORT to maximize study)
- Use longer durations for intensive exam preparation`
  : timetableMode === "long-term-exam"
  ? `**⚖️ FLEXIBLE + LONG-TERM EXAM MODE (BALANCED):**
- Revision sessions: 45-60 minutes (MODERATE sessions)
- Homework: Use exact specified duration
- Breaks: 10-15 minutes (REGULAR breaks)
- Balance sustainable learning with effective study periods`
  : timetableMode === "no-exam"
  ? `**📝 FLEXIBLE + NO EXAM MODE (HOMEWORK-FOCUSED):**
- Revision sessions: ~20 minutes (VERY SHORT light maintenance sessions)
- Homework: Use exact specified duration (TOP PRIORITY)
- Breaks: 15-20 minutes (LONG relaxed breaks)
- Keep revision minimal and light - focus on homework completion`
  : `**📖 FLEXIBLE + DEFAULT MODE:**
- Revision sessions: 45-60 minutes (standard duration)
- Focus topics: 60-90 minutes (extra time for difficult topics)
- Homework: Use exact specified duration
- Breaks: 10-15 minutes`}

**CRITICAL SESSION STRUCTURE & RECOMMENDED RESOURCES:**

For ALL subjects (except the very first topic of each subject):
- Each topic should have TWO different session types where possible:
  1. **Practice Session** - Active practice using recommended tools:
     - Mathematics: Dr Frost Maths, Corbett Maths
     - Physics: Revisely, SaveMyExams, Isaac Physics
     - Chemistry: Revisely, SaveMyExams
     - Biology: Revisely, SaveMyExams
     - All subjects: SaveMyExams (covers all GCSE subjects)
  
  2. **Exam Questions Session** - Past paper practice:
     - PMT (Physics & Maths Tutor) - all subjects
     - Study Mind - all subjects
     - SaveMyExams - has past papers too
     - Subject-specific exam board papers

**FIRST TOPIC STRUCTURE (for all subjects EXCEPT Mathematics):**
- For the FIRST topic of each non-maths subject, use this structure:
  1. **Revision Notes Session** - Reading and understanding notes
  2. **Exam Questions Session** - Applying knowledge through questions

**MATHEMATICS FIRST TOPIC:**
- First maths topic follows the standard 2-session structure (Practice + Exam Questions)

**🚨 FLEXIBLE SESSION ALLOCATION BASED ON PRIORITY - YOU MUST FOLLOW THIS 🚨:**

DO NOT make all topics the same. YOU MUST LOOK AT THE PRIORITY CONTEXT ABOVE and apply it here:

- **HIGH PRIORITY/DIFFICULT TOPICS** (priority 7-10, or in FOCUS TOPICS list): 
  * Need 3-4+ sessions (mix of practice and exam questions)
  * Each session duration: 60-75 MINUTES (longer sessions for complex topics)
  * Get scheduled MORE FREQUENTLY throughout the timetable
  * Receive MORE study time overall

- **MEDIUM PRIORITY TOPICS** (priority 4-6):
  * Need 2 sessions (practice + exam questions)
  * Each session duration: 45-60 MINUTES (standard session length)
  * Regular frequency throughout timetable

- **LOWER PRIORITY/EASIER TOPICS** (priority 1-3):
  * Might only need 1 session (combined approach)
  * Each session duration: 20-40 MINUTES (shorter sessions for simpler topics)
  * Less frequent scheduling

- AI should intelligently allocate sessions based on:
  * PRIORITY LEVEL from the priority context (HIGH/MEDIUM/LOW - see above)
  * Time available in the schedule
  * Total number of topics to cover
  * Topic difficulty (harder = longer sessions, UP TO 75 minutes)
  * Proximity to test dates

**SESSION NOTES FIELD:**
- MUST include the recommended resource in the notes field
- Example: "Practice using Dr Frost Maths exercises"
- Example: "Exam questions from PMT past papers"
- Example: "Revision notes - read and summarize key concepts"

TIMETABLE PERIOD: ${startDate} to ${endDate}

**TEST DAY BLOCKING (CRITICAL):**
${testDates.length > 0 ? `The following dates are TEST DAYS and are COMPLETELY BLOCKED - DO NOT schedule ANY study sessions on these dates:
${testDates.map((td: any) => {
  const subject = subjects.find((s: any) => s.id === td.subject_id);
  return `- ${td.test_date}: ${subject?.name} ${td.test_type} [BLOCKED - NO STUDY SESSIONS]`;
}).join('\n')}

Students cannot study on test days. Schedule all revision BEFORE the test date, never on the test date itself.` : ''}

**🔴 CRITICAL REQUIREMENTS - MUST FOLLOW 🔴:**
0. **📋 PRIORITY-BASED DURATION ALLOCATION - CRITICAL 📋**
   - YOU MUST READ AND APPLY THE PRIORITY CONTEXT provided earlier in this prompt
   - Different topics get DIFFERENT duration times based on their priority level
   - **HIGH PRIORITY topics (priority 7-10, FOCUS TOPICS)**: Use 60-75 minute sessions (longer for mastery)
   - **MEDIUM PRIORITY topics (priority 4-6)**: Use 45-60 minute sessions (standard time)
   - **LOWER PRIORITY topics (priority 1-3)**: Use 20-40 minute sessions (shorter for review)
   - Sessions are NOT all the same length - they scale with priority and difficulty
   - UP TO 75 MINUTES means: vary sessions based on topic priority (lower priority = shorter sessions)
   - If a topic isn't marked as high priority/focus topic, DO NOT give it a 75-minute session
   - Match session duration to topic priority level - this is critical for effective studying
   - VERIFICATION: Your final schedule should show different session durations (not all 75 mins)
${aiNotes ? "0. **FOLLOW USER'S CUSTOM INSTRUCTIONS**: The user has provided specific instructions above. These MUST be followed precisely - they take priority over general guidelines below." : ""}
${peakHoursContext ? `
0. **🧠 PEAK HOURS OPTIMIZATION - CRITICAL 🧠**
   - You have been provided with the user's peak study hours analysis above
   - Schedule HIGH-DIFFICULTY topics (priority 7-10, difficult/focus topics) during BEST performance window
   - Schedule LOW-DIFFICULTY topics (priority 1-4, easy/review topics) during WORST performance window
   - This is based on the user's actual past performance data and MUST be respected
   - Prioritize matching topic difficulty to optimal time windows for maximum effectiveness
` : ""}
${events.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0. **⛔ EVENT BLOCKING - ABSOLUTE PRIORITY ⛔**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   ⚠️  CRITICAL: Events listed above create COMPLETE TIME BLOCKS
   
   WHEN YOU SEE AN EVENT FROM 18:00 TO 21:00:
   ✗ You CANNOT schedule anything at: 18:00, 18:15, 18:30, 18:45, 19:00, 19:15, 19:30, 19:45, 20:00, 20:15, 20:30, 20:45
   ✓ The ENTIRE 180-minute duration from 18:00 to 21:00 is BLOCKED
   ✓ Next available slot is 21:00 or after
   
   VERIFICATION STEP:
   - Before scheduling any session, check if it overlaps with ANY event time
   - If session would start during an event, SKIP that time completely
   - If session would end during an event, SKIP that time completely
   - Schedule ONLY in gaps between events
   
   Events are NOT negotiable. They have ABSOLUTE priority.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ""}
${testDates.length > 0 ? "0. **TEST DAYS ARE COMPLETELY BLOCKED**: DO NOT schedule ANY sessions on the dates listed in 'TEST DAY BLOCKING'. These entire days are unavailable for studying." : ""}
1. **INCLUDE ALL TOPICS**: Every single topic listed in "ALL TOPICS TO COVER" MUST appear in the timetable at least once
2. **TWO-SESSION STRUCTURE**: Where time allows, most topics should have 2 sessions (Practice + Exam Questions), except:
   - First topic in non-maths subjects: Revision Notes + Exam Questions
   - High priority topics: 3-4+ sessions (multiple practice and exam question sessions)
   - Low priority/time-limited topics: May have just 1 combined session
3. **RESOURCE RECOMMENDATIONS**: Every session MUST include appropriate resource recommendations in the notes field (e.g., "Practice using Dr Frost Maths", "Exam questions from PMT")
4. **DURATION MODE COMPLIANCE**: ${preferences.duration_mode === "fixed" 
  ? `FIXED MODE - ALL sessions MUST be EXACTLY ${preferences.session_duration} minutes and ALL breaks MUST be EXACTLY ${preferences.break_duration} minutes. NO EXCEPTIONS.`
  : `FLEXIBLE MODE - Vary durations intelligently: homework (exact specified duration), focus topics (60-90 mins), regular topics (30-45 mins), breaks (10-15 mins)`}
5. **FOCUS TOPICS GET SIGNIFICANTLY MORE TIME**: Topics listed in "FOCUS TOPICS" section need MUCH MORE study time:
   - Schedule the EXACT number of sessions specified for each focus topic (typically 4-6 sessions per focus topic)
   - Use a MIX of practice sessions and exam question sessions for these topics
   ${preferences.duration_mode === "flexible" 
     ? "- Each focus topic session should be LONGER (60-90 minutes)" 
     : `- Each focus topic session uses the fixed ${preferences.session_duration} minute duration`}
   - Distribute these sessions throughout the study period (not all on the same day)
   - Space out focus topic sessions - don't cluster them all together
6. **REGULAR TOPICS**: Topics NOT in the focus list get scheduled with fewer sessions (1-2 sessions each depending on time available)
   ${preferences.duration_mode === "flexible" 
     ? "- Each regular topic session: 30-45 minutes" 
     : `- Each regular topic session: ${preferences.session_duration} minutes (fixed)`}
7. **HOMEWORK DURATION**: ${preferences.duration_mode === "fixed" 
  ? `Each homework session MUST use the fixed ${preferences.session_duration} minute duration. If homework needs more time, split it into multiple ${preferences.session_duration}-minute sessions across different days.`
  : "Each homework session MUST use its exact specified duration (e.g., 150 mins, 60 mins, 30 mins). Large homework (>120 mins) can be split into multiple sessions if needed."}
8. **TEST PREPARATION IS ABSOLUTE PRIORITY**: Subjects with upcoming tests MUST receive significantly more study sessions:
   - Allocate 2-3x MORE sessions to test subjects compared to non-test subjects
   - Schedule test subjects MORE FREQUENTLY (every 2-3 days)
   - Use LONGER sessions for test subjects (60-90 mins in flexible mode)
   - Focus heavily on EXAM QUESTIONS and PAST PAPERS for test subjects (70% of sessions)
   - In final 7 days before test: DAILY sessions for that subject (intensive review)
   - Schedule test subjects during PEAK STUDY HOURS when available
9. DO NOT schedule any revision for a topic AFTER its test date has passed
10. Prioritize revision for topics with upcoming test dates (schedule more sessions closer to the test)
11. Include the test date in the notes field for sessions related to topics with tests
12. MUST schedule study sessions ONLY within the specified time periods for each day
12. Distribute sessions EVENLY across ALL enabled study days - do not skip any enabled day
10. **HOMEWORK INTEGRATION (CRITICAL)**: 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚨 HOMEWORK MUST BE COMPLETED BEFORE THE DUE DATE 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   - **MANDATORY**: EVERY homework assignment MUST appear in the timetable as dedicated "homework" type sessions
   - Homework has HARD DEADLINES - it must be SUBMITTED/HANDED IN on the due date
   - This means homework must be COMPLETED at least 1 day BEFORE the due date
   - Scheduling homework ON the due date means it won't be ready for submission
   
    **🔴 ABSOLUTE DEADLINE RULE 🔴**
    ✗ NEVER schedule homework ON its due date (it must be ready for submission then!)
    ✗ Student cannot work on homework the same day it's due - it's too late
    ✓ MUST schedule at least 1 FULL DAY before the due date (MINIMUM requirement)
    ✓ IDEAL: Schedule homework 2-3 days BEFORE the due date for best results
    ✓ URGENT: If homework is due very soon, schedule it ASAP (as early as possible)
    
    **HOMEWORK SUBMISSION TIMELINE**:
    The due date is when homework must be SUBMITTED/HANDED IN (already completed).
    Therefore, the work must be DONE BEFORE that date.
    
    SCHEDULING FORMULA (in order of preference):
    1. ⭐ BEST PRACTICE: If homework due date = X, schedule on X-2 or X-3 (2-3 days before)
    2. ✅ ACCEPTABLE: If time is tight, schedule on X-1 (1 day before due date)
    3. 🚨 URGENT: If due very soon and no earlier slot available, schedule ASAP
    4. ❌ NEVER: Schedule on X (the due date itself) - homework won't be ready!
    
    REAL EXAMPLES:
    • Homework due 2025-01-15 → ⭐ BEST: 2025-01-13, ✅ OK: 2025-01-14, ❌ NEVER: 2025-01-15
    • Homework due 2025-01-25 → ⭐ BEST: 2025-01-23, ✅ OK: 2025-01-24, ❌ NEVER: 2025-01-25
    • Homework due tomorrow → 🚨 Schedule TODAY (as early as possible in the day)
    • WRONG EXAMPLE: Homework due 2025-01-20 → Scheduled on 2025-01-20 ❌ (TOO LATE!)
   
   - **USE EXACT HOMEWORK DURATION**: The duration field MUST match the homework's specified duration (e.g., 150, 60, 30 mins)
   - Break large homework (>120 mins) into 2-3 sessions across different days, each using portion of total duration
   - Homework sessions MUST use type="homework" and include homeworkDueDate field
   - Topic field should contain the homework title
   - Subject field should match the homework subject
   - Notes field should describe the homework (e.g., "Complete algebra homework - Due: YYYY-MM-DD")
   
    **VERIFICATION CHECKLIST**:
    ✓ Number of homework sessions = EXACTLY the number of homework assignments provided above
    ✓ ALL homework scheduled BEFORE (not on) due date - MINIMUM 1 day before, IDEAL 2-3 days before
    ✓ ZERO homework sessions on their actual due dates (homework must be ready for submission)
    ✓ URGENT homework (due very soon) scheduled ASAP even if not ideal timing
    ✓ Front-load homework in the schedule (schedule earlier rather than later for safety)
    ✓ If homework list says "X homework assignments", you MUST create EXACTLY X homework sessions
    ✓ Each homework has enough time allocated BEFORE its due date to complete the work
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a detailed, balanced study schedule that:
1. **FIRST AND FOREMOST: Schedule ALL homework assignments** 
   - Homework has HARD DEADLINES and is MANDATORY - EVERY assignment MUST be scheduled
   - Count the homework assignments listed above and create EXACTLY that many homework sessions
   - **🚨 CRITICAL DEADLINE RULE**: Homework MUST be completed BEFORE the due date (not on the due date)
   - Due date = submission/hand-in date, so work must be DONE at least 1 day before
   - IDEAL: Schedule 2-3 days BEFORE due date | MINIMUM: Schedule at least 1 day before
   - NEVER schedule homework ON its actual due date - it must be ready for submission then!
   - If you see 5 homework assignments in the list, you MUST create 5 homework sessions in the schedule
   ${preferences.duration_mode === "fixed" 
     ? `- **FIXED DURATION**: Each homework session MUST be ${preferences.session_duration} minutes. Split larger homework into multiple ${preferences.session_duration}-min sessions if needed.`
     : "- **EXACT DURATION**: Set duration field to the homework's specified duration (e.g., 150 mins, 60 mins, 30 mins). Split large homework (>120 mins) into 2-3 sessions if needed."}
   - Use type="homework", include homeworkDueDate, use homework title as topic
2. **🎯 MANDATORY: FILL THE ENTIRE TIME WINDOW TO THE END 🎯**
   - **CRITICAL**: If user requests study until 23:30, you MUST generate sessions that reach 23:30
   - The LAST session must end at or very close to the user's requested end time
   - **NEVER stop early** - if the user wants to study until 23:30, don't stop at 21:00 or 22:00
   - If you run out of selected topics BEFORE reaching the end time, you MUST add more content:
     * Repeat important/difficult topics with additional practice sessions
     * Add extra exam question sessions for topics with upcoming tests
     * Create extended revision sessions for topics that need reinforcement
     * Add more homework sessions if homework exists
     * Add "General Revision" sessions covering multiple topics
   - The schedule MUST fill the ENTIRE time window from start to end for EVERY enabled study day
   - **VERIFICATION**: Check that the last session on each day ends at or near the user's requested end time
   - **WORK AROUND EVENTS - MANDATORY**: If an event blocks time (e.g., 18:00-21:00):
     * Schedule sessions BEFORE the event starts (use time before 18:00)
     * Schedule sessions AFTER the event ends (use time after 21:00 until day's end time)
     * Example: If day is 09:00-23:00 with event 18:00-21:00, schedule 09:00-18:00 AND 21:00-23:00
     * **DO NOT STOP** after an event - CONTINUE SCHEDULING until the day's requested end time
   - **SCHOOL HOURS BLOCKING**: School events (e.g., 08:00-16:00 weekdays) work the same way:
     * If user's study window is 09:00-22:00 and school is 08:00-16:00, schedule ONLY 16:00-22:00 on weekdays
     * Weekends are NOT affected by school hours - fill the entire requested time window
     * Before-school and lunch slots are OPTIONAL additions if user enabled them
3. **IMPLEMENTS TWO-SESSION STRUCTURE**: For each topic, intelligently create appropriate sessions:
   - **Most topics**: 2 sessions (Practice with recommended tools + Exam questions)
   - **First topic in non-maths subjects**: 2 sessions (Revision notes + Exam questions)
   - **High priority/difficult topics**: 3-4+ sessions (mix of practice and exam question sessions)
   - **Low priority/time-limited topics**: 1 session (combined approach)
   - Session type should be indicated in notes field with resource recommendations
4. **INCLUDES EVERY SINGLE TOPIC**: Every topic from "ALL TOPICS TO COVER" must appear at least once
5. **MULTIPLE SESSIONS FOR FOCUS TOPICS**: Topics in the "FOCUS TOPICS" section MUST have:
   - The EXACT number of study sessions specified (typically 4-6 sessions each)
   - A MIX of "practice" and "exam questions" sessions
   ${preferences.duration_mode === "flexible" 
     ? "- Each session using LONGER duration (60-90 minutes per session)"
     : `- Each session using the FIXED ${preferences.session_duration} minute duration`}
   - Sessions distributed throughout the timetable period (spread across different days/weeks)
6. **APPROPRIATE TIME FOR REGULAR TOPICS**: Non-focus topics get 1-2 sessions each (time permitting)
   ${preferences.duration_mode === "flexible" 
     ? "- Each session: 30-45 minutes"
     : `- Each session: ${preferences.session_duration} minutes`}
7. **RESOURCE RECOMMENDATIONS IN NOTES**: Every session must include recommended study resources in the notes field:
   - Practice sessions: "Practice using [Dr Frost Maths / Revisely / SaveMyExams]"
   - Exam questions: "Exam questions from [PMT / Study Mind / SaveMyExams]"
   - Revision notes: "Read and summarize revision notes"
8. **SESSION DURATION COMPLIANCE**: ${preferences.duration_mode === "fixed" 
  ? `ALL sessions must be EXACTLY ${preferences.session_duration} minutes and ALL breaks must be EXACTLY ${preferences.break_duration} minutes. This is a STRICT requirement in fixed mode.`
  : "Session lengths should vary intelligently based on task type (homework exact duration, focus topics 60-90 mins, regular topics 30-45 mins)."}
9. Allocates more time to subjects with upcoming tests
10. Includes regular breaks between study sessions
11. ALWAYS schedules sessions within the specific time periods for each enabled day
12. Balances all subjects to avoid burnout
13. Includes revision of previously covered material
14. STOPS scheduling revision for each topic after its test date
15. Ensures consistent daily coverage on all enabled study days

**HOMEWORK COMPLETION CHECK - CRITICAL VERIFICATION**: Before finalizing, verify:
1. **COUNT CHECK**: You've created a homework session for EACH homework assignment listed above
   - If list shows 5 homework assignments, you MUST have exactly 5 homework sessions in schedule
   - Missing even ONE homework is a CRITICAL FAILURE
2. **DURATION CHECK**: ${preferences.duration_mode === "fixed" 
  ? `Each homework session uses the FIXED ${preferences.session_duration} minute duration (split larger homework into multiple sessions if needed)`
  : "Each homework session uses the EXACT duration specified for that homework"}
3. **🚨 DATE CHECK - ABSOLUTE REQUIREMENT**: 
   - ZERO homework sessions scheduled ON their due dates
   - ALL homework must be scheduled BEFORE the due date (minimum 1 day, ideal 2-3 days)
   - The due date is submission day - homework must be COMPLETED before then
   - Verify each homework is scheduled with enough time to finish BEFORE its due date
4. **TYPE CHECK**: All homework sessions use type="homework" and include homeworkDueDate field

**SESSION STRUCTURE CHECK**: Before finalizing, verify:
1. Most topics have 2 sessions (Practice + Exam Questions) where time permits
2. First topic in non-maths subjects has 2 sessions (Revision Notes + Exam Questions)
3. High priority topics have 3-4+ sessions with mix of practice and exam questions
4. Every session includes resource recommendations in notes field

**FOCUS vs REGULAR TOPICS CHECK**: Before finalizing, verify:
${preferences.duration_mode === "fixed"
  ? `1. Focus topics have 4-6 sessions EACH, all using FIXED ${preferences.session_duration} minute duration, with mix of practice and exam question sessions\n2. Regular (non-focus) topics have 1-2 sessions EACH using FIXED ${preferences.session_duration} minute duration\n3. ALL breaks are EXACTLY ${preferences.break_duration} minutes`
  : "1. Focus topics have 4-6 sessions EACH with LONGER durations (60-90 mins per session), with mix of practice and exam question sessions\n2. Regular (non-focus) topics have 1-2 sessions EACH with appropriate duration (30-45 mins)\n3. Session durations are VARIED and appropriate for each task type\n4. Breaks are 10-15 minutes"}

**🚨 CRITICAL OUTPUT REQUIREMENTS - WHAT TO INCLUDE IN SCHEDULE 🚨**

⚠️ YOUR SCHEDULE OUTPUT MUST ONLY CONTAIN STUDY ACTIVITIES - NOT EVENTS ⚠️
⚠️ YOU MUST ONLY USE TOPICS AND HOMEWORK FROM THE PROVIDED LISTS - NO HALLUCINATIONS ⚠️

✓ INCLUDE IN YOUR SCHEDULE (ONLY USING PROVIDED DATA):
- Study sessions for topics ONLY from the "ALL TOPICS TO COVER" list above
- Homework sessions for homework ONLY from the "HOMEWORK ASSIGNMENTS" list above
- Break sessions (type: "break")
- Practice sessions (type: "practice") - but ONLY for topics from the topics list
- Exam question sessions (type: "exam_questions") - but ONLY for topics from the topics list
- Revision sessions (type: "revision") - but ONLY for topics from the topics list

✗ ABSOLUTELY FORBIDDEN - WILL BE REJECTED:
- Events (like "Badminton", "Football", "School", etc.) - THESE ARE BLOCKING INFORMATION ONLY
- Any activities from the events list above - NEVER ADD THESE AS SESSIONS
- Made-up activities not in the topics or homework lists (e.g., random sports, hobbies, made-up topics)
- ANY session topic that doesn't exactly match a topic from "ALL TOPICS TO COVER"
- ANY homework that doesn't exactly match a homework from "HOMEWORK ASSIGNMENTS"
- User commitments that block time - these are ONLY for creating gaps
- Events are ONLY for telling you which times are unavailable

**VALIDATION RULES - YOUR OUTPUT WILL BE CHECKED**:
1. Every session with type="study"|"practice"|"exam_questions"|"revision" MUST have a topic field that EXACTLY MATCHES a topic from the "ALL TOPICS TO COVER" list
2. Every session with type="homework" MUST have a topic field that EXACTLY MATCHES a homework title from the "HOMEWORK ASSIGNMENTS" list
3. NO sessions with topics like "Badminton", "Football", "Gaming", or any activity from the events list
4. If you include a topic not in the provided lists, the entire generation will FAIL
5. ONLY use the exact topic names and homework titles provided - do not paraphrase or create variations

**CORRECT APPROACH**: 
- Read the "ALL TOPICS TO COVER" list carefully
- Read the "HOMEWORK ASSIGNMENTS" list carefully
- ONLY use these exact topics and homework titles in your schedule
- Events create gaps/empty time where you don't schedule anything
- If time remains after all topics/homework, repeat important topics with additional sessions

**WRONG APPROACH**: 
- Adding events as sessions in your output
- Making up new topics or activities not in the lists
- Adding sessions for "Badminton" or other events
- Creating homework that wasn't provided

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return a JSON object with the following structure:
{
  "schedule": {
    "YYYY-MM-DD": [
      {
        "time": "HH:MM",
        "duration": minutes,
        "subject": "subject name",
        "topic": "topic name or homework title",
        "type": "study|break|revision|homework|practice|exam_questions",
        "notes": "MUST include resource recommendations (e.g., 'Practice using Dr Frost Maths', 'Exam questions from PMT') and any specific instructions (MUST include due date for homework, test date for topics with tests)",
        "testDate": "YYYY-MM-DD" (optional, only if this topic has an associated test),
        "homeworkDueDate": "YYYY-MM-DD" (required for homework type),
        "mode": "${timetableMode || 'balanced'}" (include this to indicate the timetable mode - IMPORTANT for UI display)
      }
    ]
  }
}

⚠️ REMEMBER: Only include STUDY/HOMEWORK/BREAK sessions in your output. NEVER include events from the blocked times list!

**IMPORTANT**: Add "mode": "${timetableMode || 'balanced'}" field to EVERY session in the schedule. This helps the UI display mode-specific styling and indicators.

**PRACTICE SESSION EXAMPLE** (session 1 for a topic - USING YOUR PREFERENCES):
{
  "time": "${firstSlot.startTime}",
  "duration": ${actualSessionDuration},
  "subject": "Mathematics",
  "topic": "Quadratic Equations",
  "type": "practice",
  "notes": "Practice using Dr Frost Maths - Complete 15-20 questions on solving quadratics",
  "mode": "${timetableMode || 'balanced'}"
}

**BREAK SESSION EXAMPLE** (USING YOUR PREFERENCES):
{
  "time": "CALCULATED_TIME_AFTER_SESSION",
  "duration": ${actualBreakDuration},
  "type": "break",
  "notes": "Rest and recharge",
  "mode": "${timetableMode || 'balanced'}"
}

**EXAM QUESTIONS SESSION EXAMPLE** (session 2 for a topic):
{
  "time": "CALCULATED_TIME_AFTER_BREAK",
  "duration": ${actualSessionDuration},
  "subject": "Mathematics",
  "topic": "Quadratic Equations",
  "type": "exam_questions",
  "notes": "Exam questions from PMT - Past paper questions on quadratic equations",
  "mode": "${timetableMode || 'balanced'}"
}

**HOMEWORK SESSION EXAMPLE** (use this format):
If homework is due on 2025-11-25, schedule it on 2025-11-23 or 2025-11-24:
{
  "time": "${firstSlot.startTime}",
  "duration": 60,
  "subject": "Mathematics",
  "topic": "Complete Chapter 5 exercises",
  "type": "homework",
  "notes": "Homework assignment - Complete all questions from Chapter 5 - Due: 2025-11-25",
  "homeworkDueDate": "2025-11-25",
  "mode": "${timetableMode || 'balanced'}"
}
NOTE: This example shows the session on a date BEFORE 2025-11-25, NOT on 2025-11-25 itself.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FINAL VERIFICATION CHECKLIST - CHECK BEFORE RESPONDING 📋
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ TIME WINDOWS: First session starts at ${firstSlot.startTime} (NOT 08:00 or earlier!)
✓ TIME WINDOWS: Last session ends by ${firstSlot.endTime}
✓ SESSION DURATION: ${preferences.duration_mode === "fixed" ? `ALL sessions are EXACTLY ${preferences.session_duration} minutes (FIXED MODE)` : `Sessions vary intelligently: ${actualSessionDuration} mins typical`}
✓ BREAK DURATION: ${preferences.duration_mode === "fixed" ? `ALL breaks are EXACTLY ${preferences.break_duration} minutes (FIXED MODE)` : `Breaks are ${actualBreakDuration} minutes`}
✓ HOMEWORK: ALL homework scheduled BEFORE due date, NEVER on due date
✓ FOCUS TOPICS: High priority topics get 4-6 sessions each

⚠️ CRITICAL REMINDERS:
1. Start time is ${firstSlot.startTime} - DO NOT use 08:00 or any time before this!
2. Every session must be ${actualSessionDuration} minutes long
3. Every break must be ${actualBreakDuration} minutes long
4. The AI will verify these requirements - incorrect sessions will be DELETED

Make the schedule practical, achievable, and effective for GCSE exam preparation.`;

    // Validate date range isn't too long (max 4 weeks)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 28) {
      return new Response(
        JSON.stringify({ 
          error: "Date range too long. Maximum timetable length is 4 weeks. Please create a shorter timetable or split it into multiple timetables." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add timeout to prevent hanging - increased for complex generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for large timetables

    // Using Bytez API with Gemini 2.5 Pro for timetable generation
    const BYTEZ_API_KEY = Deno.env.get('BYTEZ_API_KEY');
    
    if (!BYTEZ_API_KEY) {
      console.error("BYTEZ_API_KEY not configured");
      throw new Error("AI service not configured. Please contact support.");
    }

    let openaiResult;
    try {
      console.log("Calling Bytez API for timetable generation...");
      const response = await fetch(
        'https://api.bytez.com/models/v2/openai/v1/chat/completions',
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": BYTEZ_API_KEY
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              { role: "user", content: `INSTRUCTIONS: You are an expert educational planner specializing in GCSE revision strategies. Return ONLY valid JSON with no markdown formatting, no code fences, no additional text. Your response must start with { and end with }. CRITICAL: Ensure the JSON is complete with all closing braces and brackets.\n\nTASK:\n${prompt}` }
            ],
            max_tokens: 65536,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Bytez API error:", response.status, errorText);
        throw new Error(`Bytez API request failed: ${response.status}`);
      }

      openaiResult = await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error("AI request timed out. Please try with a shorter date range or fewer subjects.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log("Bytez Gemini raw result:", JSON.stringify(openaiResult, null, 2));

    // Extract content from OpenAI response
    let aiResponse: string | undefined;
    
    if (openaiResult.choices?.[0]?.message?.content) {
      aiResponse = openaiResult.choices[0].message.content;
    }

    if (!aiResponse || aiResponse.trim() === "") {
      console.error("Empty AI response. Raw result:", JSON.stringify(openaiResult, null, 2));
      throw new Error("AI did not generate a response. Please try again.");
    }

    console.log("Extracted AI response (first 300 chars):", aiResponse.substring(0, 300));

    // Extract JSON from markdown code blocks if present
    let scheduleData;
    try {
      let jsonString = aiResponse.trim();
      
      // Extract JSON from markdown fences if AI ignored instructions
      const fenceMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) {
        jsonString = fenceMatch[1].trim();
        console.log("Extracted JSON from markdown fence");
      }

      if (!jsonString || jsonString.length < 10) {
        throw new Error("AI response is too short to be valid JSON");
      }

      scheduleData = JSON.parse(jsonString);
      
      // Validate that schedule exists in the response
      if (!scheduleData.schedule || typeof scheduleData.schedule !== 'object') {
        throw new Error("AI response missing valid schedule object");
      }
      
      // Enforce rule: no homework sessions on their due date
      if (Array.isArray(homeworks) && homeworks.length > 0 && scheduleData.schedule && typeof scheduleData.schedule === 'object') {
        const homeworkDueDates = new Set(homeworks.map((hw: any) => hw.due_date));
        for (const [date, sessions] of Object.entries(scheduleData.schedule)) {
          if (!homeworkDueDates.has(date) || !Array.isArray(sessions)) continue;
          scheduleData.schedule[date] = (sessions as any[]).filter((session: any) => {
            if (!session) return false;
            return session.type !== 'homework';
          });
        }
      }

      // CRITICAL: Validate schedule against events and topic/homework lists
      // We REMOVE obvious hallucinations and event-type sessions, but we DO NOT
      // delete sessions that simply overlap with events anymore. Instead we log
      // overlaps so the UI still has a usable timetable even if the AI makes
      // timing mistakes.
      if (events && events.length > 0 && scheduleData.schedule && typeof scheduleData.schedule === 'object') {
        console.log(`Validating schedule to remove hallucinated/event sessions and check overlaps with ${events.length} events`);
        
        // CRITICAL: Create validation sets for topics and homework
        const validTopicNames = new Set(topics.map((t: any) => t.name.toLowerCase().trim()));
        const validHomeworkTitles = new Set(homeworks.map((hw: any) => hw.title.toLowerCase().trim()));
        const eventTitles = new Set(events.map((e: any) => e.title.toLowerCase().trim()));
        
        console.log('Valid topics:', Array.from(validTopicNames));
        console.log('Valid homework:', Array.from(validHomeworkTitles));
        console.log('Events (should NOT appear as sessions):', Array.from(eventTitles));
        
        // Create a map of events by date for efficient lookup
        const eventsByDate = new Map<string, any[]>();
        events.forEach((event: any) => {
          const eventDate = new Date(event.start_time);
          const dateKey = eventDate.toISOString().split('T')[0];
          if (!eventsByDate.has(dateKey)) {
            eventsByDate.set(dateKey, []);
          }
          eventsByDate.get(dateKey)!.push({
            startTime: new Date(event.start_time),
            endTime: new Date(event.end_time),
            title: event.title,
          });
        });

        // Helper function to check if a session overlaps with any event
        const overlapsWithEvent = (sessionDate: string, sessionTime: string, sessionDuration: number): boolean => {
          const eventsOnDate = eventsByDate.get(sessionDate);
          if (!eventsOnDate || eventsOnDate.length === 0) return false;

          // Parse session time
          const [hours, minutes] = sessionTime.split(':').map(Number);
          const sessionStart = new Date(sessionDate);
          sessionStart.setHours(hours, minutes, 0, 0);
          const sessionEnd = new Date(sessionStart);
          sessionEnd.setMinutes(sessionEnd.getMinutes() + sessionDuration);

          // Sessions overlap if they start before event ends AND end after event starts
          return eventsOnDate.some((event) => {
            return sessionStart < event.endTime && sessionEnd > event.startTime;
          });
        };

        let hallucinationCount = 0;
        let eventSessionCount = 0;
        let overlapWarningCount = 0;
        
        for (const [date, sessions] of Object.entries(scheduleData.schedule)) {
          if (!Array.isArray(sessions)) continue;
          
          scheduleData.schedule[date] = (sessions as any[]).filter((session: any) => {
            if (!session || !session.time || !session.duration) return true;
            
            // CRITICAL: Validate that this isn't a hallucinated topic or event
            if (session.type !== 'break') {
              const sessionTopic = (session.topic || '').toLowerCase().trim();
              
              // Check if this is an event being added as a session (FORBIDDEN)
              if (eventTitles.has(sessionTopic)) {
                console.log(`🚨 REJECTED: Event "${session.topic}" added as ${session.type} session on ${date} ${session.time}`);
                hallucinationCount++;
                return false;
              }
              
              // Check if this topic exists in provided lists
              const isValidTopic = validTopicNames.has(sessionTopic);
              const isValidHomework = session.type === 'homework' && validHomeworkTitles.has(sessionTopic);
              
              if (!isValidTopic && !isValidHomework) {
                console.log(`🚨 REJECTED: Invalid topic "${session.topic}" (type: ${session.type}) on ${date} ${session.time} - not in provided lists`);
                hallucinationCount++;
                return false;
              }
            }
            
            // Remove any event-type sessions completely
            if (session.type === 'event') {
              console.log(`🚨 REJECTED: Event-type session "${session.topic || session.title}" on ${date} ${session.time}`);
              eventSessionCount++;
              return false;
            }
            
            // Check for event overlap but DO NOT remove; just log for debugging
            const isOverlapping = overlapsWithEvent(date, session.time, session.duration);
            if (isOverlapping) {
              console.log(`⚠️ Session overlaps event but kept in schedule: ${date} ${session.time} ${session.subject || ''} - ${session.topic || ''}`);
              overlapWarningCount++;
            }
            
            return true;
          });
        }
        
        if (hallucinationCount > 0) {
          console.log(`🚨 Total hallucinations removed: ${hallucinationCount} invalid/event-title sessions`);
        }
        
        if (eventSessionCount > 0) {
          console.log(`🚨 Total event-type sessions removed: ${eventSessionCount}`);
        }

        if (overlapWarningCount > 0) {
          console.log(`⚠️ Detected ${overlapWarningCount} sessions that overlap events (kept for now to avoid empty schedules).`);
        } else {
          console.log('✓ Schedule validation passed - no overlaps detected');
        }
      }

      // CRITICAL: Post-processing validation to enforce time windows
      // This ensures sessions are ONLY within user's specified time slots
      console.log('🕐 Starting time window validation...');
      
      // Build a map of day -> time window
      const dayTimeWindows = new Map<string, { startTime: string; endTime: string }>();
      preferences.day_time_slots.forEach((slot: any) => {
        if (slot.enabled) {
          dayTimeWindows.set(slot.day.toLowerCase(), {
            startTime: slot.startTime,
            endTime: slot.endTime
          });
        }
      });
      
      console.log('Enabled time windows:', Object.fromEntries(dayTimeWindows));
      
      let timeWindowRemovedCount = 0;
      
      for (const [dateStr, sessions] of Object.entries(scheduleData.schedule)) {
        if (!Array.isArray(sessions)) continue;
        
        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const timeWindow = dayTimeWindows.get(dayName);
        
        if (!timeWindow) {
          // Day not enabled - remove all sessions
          console.log(`⚠️ Removing ${sessions.length} sessions on disabled day: ${dateStr} (${dayName})`);
          timeWindowRemovedCount += sessions.length;
          scheduleData.schedule[dateStr] = [];
          continue;
        }
        
        const [windowStartHour, windowStartMin] = timeWindow.startTime.split(':').map(Number);
        const [windowEndHour, windowEndMin] = timeWindow.endTime.split(':').map(Number);
        const windowStartMins = windowStartHour * 60 + windowStartMin;
        const windowEndMins = windowEndHour * 60 + windowEndMin;
        
        scheduleData.schedule[dateStr] = (sessions as any[]).filter((session: any) => {
          if (!session.time || !session.duration) return true;
          
          const [sessionHour, sessionMin] = session.time.split(':').map(Number);
          const sessionStartMins = sessionHour * 60 + sessionMin;
          const sessionEndMins = sessionStartMins + (session.duration || 0);
          
          // Check if session is within allowed window
          if (sessionStartMins < windowStartMins) {
            console.log(`🚫 REMOVED: Session starts too early on ${dateStr}: ${session.time} (window starts at ${timeWindow.startTime}) - ${session.subject || ''} ${session.topic || ''}`);
            timeWindowRemovedCount++;
            return false;
          }
          
          if (sessionEndMins > windowEndMins) {
            console.log(`🚫 REMOVED: Session ends too late on ${dateStr}: ${session.time} + ${session.duration}min ends at ${Math.floor(sessionEndMins/60)}:${String(sessionEndMins%60).padStart(2,'0')} (window ends at ${timeWindow.endTime}) - ${session.subject || ''} ${session.topic || ''}`);
            timeWindowRemovedCount++;
            return false;
          }
          
          return true;
        });
      }
      
      if (timeWindowRemovedCount > 0) {
        console.log(`🕐 Time window validation: ${timeWindowRemovedCount} sessions removed for being outside user's time windows`);
      } else {
        console.log('✓ Time window validation passed - all sessions within allowed windows');
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse.substring(0, 500));
      console.error("Parse error:", parseError);
      const errorMsg = parseError instanceof Error ? parseError.message : 'Could not parse JSON';
      throw new Error(`Invalid AI response format: ${errorMsg}`);
    }

    return new Response(JSON.stringify(scheduleData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-timetable:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
