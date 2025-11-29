import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      timetableId, 
      currentDate, 
      tomorrowDate,
      reflection, 
      selectedTopics,
      incompleteSessions,
      difficultTopics,
      startTime,
      endTime
    } = await req.json();

    // Validate required fields
    if (!timetableId) {
      return new Response(JSON.stringify({ error: 'Timetable ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure dates are valid
    const validCurrentDate = currentDate || new Date().toISOString().split('T')[0];
    const validTomorrowDate = tomorrowDate || (() => {
      const tomorrow = new Date(validCurrentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })();

    // Validate that tomorrowDate is a valid date
    const targetDateObj = new Date(validTomorrowDate);
    if (isNaN(targetDateObj.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid date format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Regenerate tomorrow request:', {
      timetableId,
      currentDate: validCurrentDate,
      tomorrowDate: validTomorrowDate,
      selectedTopicsCount: selectedTopics?.length || 0,
      incompleteSessionsCount: incompleteSessions?.length || 0,
      difficultTopicsCount: difficultTopics?.length || 0,
      timing: `${startTime} - ${endTime}`
    });

    // Fetch timetable and related data
    const { data: timetable, error: timetableError } = await supabase
      .from('timetables')
      .select('*')
      .eq('id', timetableId)
      .eq('user_id', user.id)
      .single();

    if (timetableError || !timetable) {
      console.error('Timetable error:', timetableError);
      return new Response(JSON.stringify({ error: 'Timetable not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch preferences
    const { data: preferences } = await supabase
      .from('study_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch events for tomorrow (all instances)
    const { data: tomorrowEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', `${validTomorrowDate}T00:00:00`)
      .lte('end_time', `${validTomorrowDate}T23:59:59`)
      .order('start_time', { ascending: true });

    // Deduplicate events by unique combination of time and title (not ID)
    const uniqueTomorrowEvents = Array.from(
      new Map((tomorrowEvents || []).map((e: any) => [
        `${e.title}-${e.start_time}-${e.end_time}`,
        e,
      ])).values()
    );

    // Fetch homework - exclude homework due on or before tomorrow's date
    // Convert validTomorrowDate to end of day to properly filter
    const tomorrowEndOfDay = `${validTomorrowDate}T23:59:59`;
    const { data: homeworkList } = await supabase
      .from('homeworks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .gt('due_date', tomorrowEndOfDay); // Only homework due AFTER tomorrow (next day or later)

    const tomorrowDayOfWeek = targetDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Fetch school schedule from preferences
    let schoolHoursContext = "";
    if (preferences) {
      const hasSchoolHours = preferences.school_start_time && preferences.school_end_time;
      if (hasSchoolHours) {
        const isWeekday = !['saturday', 'sunday'].includes(tomorrowDayOfWeek);
        
        schoolHoursContext = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏫 SCHOOL HOURS BLOCKING ${isWeekday ? '- ACTIVE TODAY' : '- NOT ACTIVE (WEEKEND)'} 🏫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isWeekday ? `⚠️ CRITICAL: User attends school TODAY:
   Leave for school: ${preferences.school_start_time}
   Return from school: ${preferences.school_end_time}

🚫 MANDATORY BLOCKING RULES - STRICTLY ENFORCED:
1. ❌ NEVER schedule ANY study sessions between ${preferences.school_start_time} and ${preferences.school_end_time}
2. ❌ This time is COMPLETELY UNAVAILABLE
3. ✅ Only schedule BEFORE ${preferences.school_start_time} OR AFTER ${preferences.school_end_time}

🔒 USER PREFERENCE FLAGS (RESPECT THESE STRICTLY):
${preferences.study_before_school === true ? `✅ BEFORE SCHOOL ENABLED: User wants sessions before school (${preferences.before_school_start} - ${preferences.before_school_end})
   - You MAY schedule SHORT homework sessions (15-25 mins) in this time slot
   - ONLY homework, never revision/exam prep` : `❌ BEFORE SCHOOL DISABLED: User does NOT want any sessions before school
   - DO NOT schedule anything before ${preferences.school_start_time}
   - Leave this time completely empty`}

${preferences.study_during_lunch === true ? `✅ LUNCH TIME ENABLED: User wants sessions during lunch (${preferences.lunch_start} - ${preferences.lunch_end})
   - You MAY schedule SHORT homework sessions (15-20 mins) during lunch
   - ONLY homework, never revision/exam prep` : `❌ LUNCH TIME DISABLED: User does NOT want any sessions during lunch
   - DO NOT schedule anything during lunch hours
   - Lunch time is break time, not study time`}

${preferences.study_during_free_periods === true ? `✅ FREE PERIODS ENABLED: User wants short homework during free periods at school
   - You MAY add SHORT homework sessions during school hours (15-25 mins)
   - ONLY homework, never revision/exam prep` : `❌ FREE PERIODS DISABLED: User does NOT want any sessions during school
   - DO NOT schedule anything during ${preferences.school_start_time} - ${preferences.school_end_time}
   - School time is completely off-limits for study`}

🎯 CRITICAL SUMMARY:
${!preferences.study_before_school && !preferences.study_during_lunch && !preferences.study_during_free_periods 
  ? `⚠️ ALL SCHOOL-TIME STUDY DISABLED ⚠️
     The user has explicitly disabled ALL school-time study options.
     DO NOT schedule ANYTHING before school, during school, or during lunch.
     ONLY schedule AFTER ${preferences.school_end_time}.` 
  : `⚠️ SOME SCHOOL-TIME STUDY ENABLED ⚠️
     Respect the enabled flags above - only schedule in explicitly enabled time slots.
     All other school time remains COMPLETELY BLOCKED.`}
` : 'Today is a weekend - no school hours blocking required.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
      }
    }
    
    // Look up the specific day's time slot from preferences if not provided
    let effectiveStartTime = startTime;
    let effectiveEndTime = endTime;

    if (preferences && (!startTime || !endTime)) {
      const dayTimeSlots = (preferences.day_time_slots as any[]) || [];
      const targetSlot = dayTimeSlots.find((slot: any) => 
        slot.day.toLowerCase() === tomorrowDayOfWeek && slot.enabled
      );
      
      if (targetSlot) {
        effectiveStartTime = effectiveStartTime || targetSlot.startTime;
        effectiveEndTime = effectiveEndTime || targetSlot.endTime;
        console.log(`Using ${tomorrowDayOfWeek}'s time slot from preferences: ${targetSlot.startTime}-${targetSlot.endTime}`);
      }
    }

    // Fall back to defaults if still not set
    effectiveStartTime = effectiveStartTime || '09:00';
    effectiveEndTime = effectiveEndTime || '17:00';
    
    console.log(`Effective time window for ${tomorrowDayOfWeek}: ${effectiveStartTime}-${effectiveEndTime}`);
    
    const sessionDuration = preferences?.session_duration || 45;
    const breakDuration = preferences?.break_duration || 15;

    // Build comprehensive prompt for AI
    const prompt = `You are an expert study schedule generator. Generate a realistic study schedule for tomorrow with QUALITY over quantity.

${schoolHoursContext}

**DATE**: ${validTomorrowDate} (${tomorrowDayOfWeek})

**TIMING CONSTRAINTS**
- Start Time: ${effectiveStartTime}
- End Time: ${effectiveEndTime}
- Target Session Duration: 60 minutes per topic (can vary 45-90 minutes based on difficulty/confidence)
- Break Duration: ${breakDuration} minutes (use strategically, NOT after every session)

**STUDENT'S REFLECTION FROM TODAY**
"${reflection || 'No reflection provided'}"

**SELECTED TOPICS FOR TOMORROW** (ORDERED BY PRIORITY - first topics are HIGHEST priority)
${JSON.stringify(selectedTopics || [], null, 2)}

**DIFFICULT TOPICS** (Previously marked as challenging - give extra time if selected)
${JSON.stringify(difficultTopics || [], null, 2)}

**INCOMPLETE SESSIONS FROM TODAY** (Consider including if reflection suggests rescheduling)
${JSON.stringify(incompleteSessions || [], null, 2)}

**AVAILABLE HOMEWORK** (Use exact subject/title/duration from this list)
${homeworkList && homeworkList.length > 0 ? 
  `🚨 HOMEWORK MUST BE COMPLETED BEFORE DUE DATE - NEVER ON THE DUE DATE 🚨

${homeworkList.map(h => {
    const dueDate = new Date(h.due_date);
    const formattedDueDate = dueDate.toISOString().split('T')[0];
    const dueTime = dueDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const tomorrowDateObj = new Date(validTomorrowDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - tomorrowDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 1) {
      return `- "${h.title}" (${h.subject}) - DUE: ${formattedDueDate} at ${dueTime}, DURATION: ${h.duration || 60} minutes
   🚨 URGENT: Due in ${daysUntilDue} day(s) - MUST schedule tomorrow to complete before deadline!`;
    } else {
      return `- "${h.title}" (${h.subject}) - DUE: ${formattedDueDate} at ${dueTime}, DURATION: ${h.duration || 60} minutes
   ⏰ Due in ${daysUntilDue} days - Can schedule tomorrow or wait, but MUST complete BEFORE ${formattedDueDate}`;
    }
  }).join('\n')}

CRITICAL HOMEWORK RULES:
- Homework due date = submission/hand-in date (must be completed BEFORE then)
- NEVER schedule homework ON its due date - it must be ready for submission
- If homework is due tomorrow (${validTomorrowDate}), DO NOT schedule it - it's too late!
- Only schedule homework if there's at least 1 day between tomorrow and the due date
- Prioritize urgent homework (due in 1-2 days) over regular study topics`
  : 'No homework to schedule (all completed or due too soon)'
}

**🔴 BLOCKED EVENT TIMES TOMORROW 🔴**
${uniqueTomorrowEvents && uniqueTomorrowEvents.length > 0 ? 
  `These times are COMPLETELY BLOCKED - DO NOT schedule anything during these periods:
${uniqueTomorrowEvents.map(e => {
  const start = new Date(e.start_time);
  const end = new Date(e.end_time);
  const durationMins = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  return `⛔ ${e.title}: ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} → ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (${durationMins} mins BLOCKED)`;
}).join('\n')}

CRITICAL BLOCKING RULES:
1. The ENTIRE duration of each event is unavailable
2. DO NOT schedule ANY sessions that overlap with event times
3. If an event is at 18:00-21:00, you CANNOT schedule sessions at 18:00, 18:30, 19:00, 19:30, 20:00, or 20:30
4. Only schedule BEFORE the event starts OR AFTER the event completely ends
5. Account for session duration - a 60-min session cannot start at 17:30 if an event starts at 18:00` 
  : 'No events tomorrow - full time window available.'}

**TEST DAY CHECK**
${timetable.test_dates && Array.isArray(timetable.test_dates) && timetable.test_dates.length > 0 ? 
  (() => {
    const isTestDay = timetable.test_dates.some((test: any) => test.test_date === validTomorrowDate);
    if (isTestDay) {
      const testsOnDay = timetable.test_dates.filter((test: any) => test.test_date === validTomorrowDate);
      return `CRITICAL: Tomorrow is a TEST DAY. Return an EMPTY schedule array.
Tests scheduled:
${testsOnDay.map((test: any) => `- ${test.subject}: ${test.test_type}`).join('\n')}

The user CANNOT study on test days. Return: {"schedule": [], "summary": "Tomorrow is a test day - no study sessions scheduled", "reasoning": "Test days are blocked for studying"}`;
    }
    
    // Check for upcoming tests within the next 7 days
    const tomorrowTime = new Date(validTomorrowDate).getTime();
    const upcomingTests = timetable.test_dates.filter((test: any) => {
      const testTime = new Date(test.test_date).getTime();
      const daysUntilTest = Math.ceil((testTime - tomorrowTime) / (1000 * 60 * 60 * 24));
      return daysUntilTest > 0 && daysUntilTest <= 7;
    });
    
    if (upcomingTests.length > 0) {
      return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 UPCOMING TESTS - PRIORITY SCHEDULING 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ TESTS IN THE NEXT 7 DAYS - MAXIMUM PRIORITY ⚠️

${upcomingTests.map((test: any) => {
  const testTime = new Date(test.test_date).getTime();
  const daysUntilTest = Math.ceil((testTime - tomorrowTime) / (1000 * 60 * 60 * 24));
  return `📅 ${test.subject} ${test.test_type} in ${daysUntilTest} day${daysUntilTest !== 1 ? 's' : ''} (${test.test_date})`;
}).join('\n')}

MANDATORY TEST PREPARATION RULES FOR TOMORROW:
1. **INTENSIVE FOCUS**: If selected topics include test subjects, schedule them FIRST
2. **LONGER SESSIONS**: Test subject topics get 75-90 minutes (intensive exam prep)
3. **EXAM PRACTICE PRIORITY**: Focus on exam questions and past papers for test subjects
4. **PEAK TIME ALLOCATION**: Schedule test subjects during the earliest/freshest hours
5. **FINAL WEEK PROTOCOL**: Since these tests are within 7 days:
   - Test subjects should take 60-70% of tomorrow's study time
   - Prioritize comprehensive review and exam-style practice
   - Include at least ONE test subject topic if available in selected topics

🎯 REMEMBER: These exams are approaching fast - make every minute count! 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }
    
    return '';
  })()
: ''}

**CRITICAL SCHEDULING RULES**
1. **FEWER TOPICS, MORE DEPTH**: Schedule 3-5 topics maximum for a productive day. Each topic needs 60+ minutes of focused work.
2. **Prioritize ruthlessly**: First topics in the list get prime time slots and best focus hours.
3. **Realistic breaks**: Add breaks after 2-3 hours of work, or between very different subjects. NOT after every single session.
4. **Difficulty-based timing**: 
   - Low confidence (1-4): 75-90 minutes
   - Medium confidence (5-7): 60-75 minutes  
   - High confidence (8-10): 45-60 minutes
5. **🔴 HOMEWORK DEADLINE RULE 🔴**: 
   - ✗ NEVER schedule homework ON its due date - homework must be completed BEFORE the due date
   - ✓ Homework list has been filtered to ONLY include items due AFTER ${validTomorrowDate}
   - ✓ If homework is due on Jan 15, and tomorrow is Jan 14, it will NOT appear in the list (too close to deadline)
   - ✓ Only homework due on Jan 16 or later will appear for scheduling on Jan 14
   - Use EXACT duration from homework list (already calculated correctly)
   - DO NOT DUPLICATE homework - each homework item should appear ONLY ONCE in the schedule
   - Each homework session must be completed at least 1 day before its actual due date
6. **🔴 EVENT BLOCKING 🔴**: 
   - Events create COMPLETE time blocks that are UNAVAILABLE
   - If event is 18:00-21:00 (180 mins), you CANNOT schedule ANY sessions during this time
   - A 60-min session starting at 17:30 would overlap with 18:00 event - DO NOT SCHEDULE IT
   - A 90-min session starting at 16:00 would overlap with 18:00 event - DO NOT SCHEDULE IT
   - Calculate: session start time + session duration MUST be <= event start time
   - Or: session start time MUST be >= event end time
   - Schedule sessions BEFORE event starts (with enough buffer for duration) OR AFTER event completely ends
   - Never overlap with any part of an event's duration
7. **Time format**: All times in HH:MM format (00:00-23:59)
8. **Sequential scheduling**: Calculate each start time from previous end time + break (if break added)

**RESPONSE FORMAT**
Return ONLY valid JSON:
{
  "schedule": [
    {
      "time": "HH:MM",
      "subject": "string",
      "topic": "string",
      "duration": number (45-90 for topics, exact from list for homework),
      "type": "study|homework|revision|break",
      "notes": "Brief note about why this was scheduled and why this duration"
    }
  ],
  "summary": "Plain English summary: how many topics scheduled, why these topics were chosen, total study time planned",
  "reasoning": "Why you chose this number of topics and how you allocated time"
}

**EXAMPLE GOOD SCHEDULE** (4 hour window, 3 topics):
09:00 - Topic 1 (high priority, low confidence) - 75 min
10:15 - Topic 2 (high priority, medium confidence) - 60 min  
11:30 - Break - 15 min
11:45 - Homework (from list) - 45 min
12:30 - Topic 3 (medium priority) - 60 min
= 3 topics + 1 homework + 1 strategic break`;

    console.log('Calling AI to generate tomorrow\'s schedule...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const OPEN_ROUTER_API_KEY = Deno.env.get('OPEN_ROUTER_API_KEY');
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY not configured");
    }

    let openaiResult;
    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPEN_ROUTER_API_KEY}`,
            "HTTP-Referer": Deno.env.get('SUPABASE_URL') || "https://vistari.app"
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
              { role: "user", content: `You are an expert study scheduling assistant. Create realistic, balanced schedules that respect student preferences and time constraints. Always return valid JSON.\n\n${prompt}` }
            ],
            max_tokens: 4096,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", response.status, errorText);
        throw new Error(`OpenAI API request failed: ${response.status}`);
      }

      openaiResult = await response.json();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('AI request timed out. Please try again in a moment.');
      }
      throw fetchError;
    }

    clearTimeout(timeoutId);

    console.log('OpenAI response:', JSON.stringify(openaiResult, null, 2));

    // Extract content from OpenAI response
    let responseText: string | undefined;
    if (openaiResult.choices?.[0]?.message?.content) {
      responseText = openaiResult.choices[0].message.content;
    }

    if (!responseText || responseText.trim() === "") {
      console.error('Empty AI response. Raw result:', JSON.stringify(openaiResult, null, 2));
      throw new Error('AI did not generate a response. Please try again.');
    }

    // Extract JSON from markdown if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const aiResult = JSON.parse(responseText);
    console.log('AI generated schedule:', aiResult);

    // Validate and clean the schedule with TIME WINDOW ENFORCEMENT
    const [windowStartHour, windowStartMin] = effectiveStartTime.split(':').map(Number);
    const [windowEndHour, windowEndMin] = effectiveEndTime.split(':').map(Number);
    const windowStartMins = windowStartHour * 60 + windowStartMin;
    const windowEndMins = windowEndHour * 60 + windowEndMin;
    
    console.log(`Time window validation: ${effectiveStartTime} (${windowStartMins} mins) to ${effectiveEndTime} (${windowEndMins} mins)`);
    
    let removedCount = 0;
    const validatedSchedule = (aiResult.schedule || []).map((session: any) => {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      let sessionTime = session.time || '09:00';
      
      if (!timeRegex.test(sessionTime)) {
        console.warn(`Invalid time format: ${sessionTime}, skipping session`);
        return null;
      }
      
      const [hours, minutes] = sessionTime.split(':').map(Number);
      if (hours >= 24 || minutes >= 60) {
        console.warn(`Time out of range: ${sessionTime}, skipping session`);
        return null;
      }
      
      // POST-PROCESSING: Validate session is within user's time window
      const sessionStartMins = hours * 60 + minutes;
      const sessionDurationMins = session.duration || 45;
      const sessionEndMins = sessionStartMins + sessionDurationMins;
      
      if (sessionStartMins < windowStartMins) {
        console.warn(`🚫 REMOVED: Session at ${sessionTime} starts before window (${effectiveStartTime})`);
        removedCount++;
        return null;
      }
      
      if (sessionEndMins > windowEndMins) {
        console.warn(`🚫 REMOVED: Session at ${sessionTime} (${sessionDurationMins} mins) ends at ${Math.floor(sessionEndMins/60)}:${String(sessionEndMins%60).padStart(2,'0')} - after window end (${effectiveEndTime})`);
        removedCount++;
        return null;
      }
      
      return {
        time: sessionTime,
        subject: session.subject,
        topic: session.topic,
        duration: session.duration,
        type: session.type || 'study',
        notes: session.notes || 'Generated for tomorrow',
        completed: false
      };
    }).filter(Boolean);
    
    console.log(`Time window validation complete: ${removedCount} sessions removed, ${validatedSchedule.length} sessions kept`);

    // Update timetable with new schedule for tomorrow
    const currentSchedule = timetable.schedule as Record<string, any[]>;
    const updatedSchedule = {
      ...currentSchedule,
      [validTomorrowDate]: validatedSchedule
    };

    const { error: updateError } = await supabase
      .from('timetables')
      .update({ schedule: updatedSchedule })
      .eq('id', timetableId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Tomorrow\'s schedule generated successfully');

    return new Response(JSON.stringify({
      success: true,
      schedule: validatedSchedule,
      summary: aiResult.summary || 'Schedule generated successfully',
      reasoning: aiResult.reasoning,
      tomorrowDate: validTomorrowDate
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regenerate-tomorrow:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
