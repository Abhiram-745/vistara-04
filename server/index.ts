import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { db } from "./db";
import * as schema from "../shared/schema";
import { eq, and, desc, gte, lte, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || "vistari-secret-key-change-in-production";

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No authorization token' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [newUser] = await db.insert(schema.users).values({
      email: email.toLowerCase(),
      password: hashedPassword,
    }).returning();

    await db.insert(schema.profiles).values({
      userId: newUser.id,
      fullName: fullName || null,
    });

    await db.insert(schema.studyPreferences).values({
      userId: newUser.id,
    });

    await db.insert(schema.userRoles).values({
      userId: newUser.id,
      role: 'free',
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      user: { id: newUser.id, email: newUser.email },
      token,
      session: { access_token: token }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase())).limit(1);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      user: { id: user.id, email: user.email },
      token,
      session: { access_token: token }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

app.get('/api/auth/user', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.user!.id)).limit(1);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user.id, email: user.email });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-verification-code', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.delete(schema.emailVerifications).where(eq(schema.emailVerifications.email, email.toLowerCase()));
    
    await db.insert(schema.emailVerifications).values({
      email: email.toLowerCase(),
      code,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    if (!resend) {
      console.error('Resend not configured - RESEND_API_KEY missing');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const { error: emailError } = await resend.emails.send({
      from: 'Vistari <noreply@vistara-ai.app>',
      to: email,
      subject: 'Your Vistari Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6366f1; text-align: center;">Vistari</h1>
          <h2 style="text-align: center;">Verify Your Email</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
          </div>
          <p style="color: #6b7280;">This code will expire in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error: any) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to send verification code' });
  }
});

app.post('/api/verify-code', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const [verification] = await db.select()
      .from(schema.emailVerifications)
      .where(eq(schema.emailVerifications.email, email.toLowerCase()))
      .limit(1);

    if (!verification) {
      return res.status(400).json({ error: 'No verification request found', valid: false });
    }

    if (verification.attempts && verification.attempts >= 5) {
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.', valid: false });
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(400).json({ error: 'Verification code has expired', valid: false });
    }

    await db.update(schema.emailVerifications)
      .set({ attempts: (verification.attempts || 0) + 1 })
      .where(eq(schema.emailVerifications.id, verification.id));

    if (verification.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code', valid: false });
    }

    await db.update(schema.emailVerifications)
      .set({ verified: true })
      .where(eq(schema.emailVerifications.id, verification.id));

    res.json({ valid: true, message: 'Email verified successfully' });
  } catch (error: any) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify code', valid: false });
  }
});

app.get('/api/check-email-verified/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    
    const [verification] = await db.select()
      .from(schema.emailVerifications)
      .where(and(
        eq(schema.emailVerifications.email, email.toLowerCase()),
        eq(schema.emailVerifications.verified, true)
      ))
      .limit(1);

    res.json({ verified: !!verification });
  } catch (error: any) {
    res.status(500).json({ error: error.message, verified: false });
  }
});

app.post('/api/analyze-difficulty', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { topics, focusTopics } = req.body;

    const topicsList = topics.map((t: any, i: number) => {
      let entry = `${i + 1}. ${t.name} (Subject: ${t.subject}`;
      if (t.confidence !== undefined) {
        entry += `, Confidence: ${t.confidence}/10`;
      }
      if (t.difficulties) {
        entry += `, User's notes on why it's difficult: "${t.difficulties}"`;
      }
      entry += ')';
      return entry;
    }).join('\n');

    const systemPrompt = `You are an expert GCSE study advisor. Analyze the provided topics and identify which ones should be prioritized in the study timetable based on:
1. User's confidence levels (lower confidence = higher priority)
2. User's notes about why they find topics difficult (VERY IMPORTANT - use these insights)
3. Topic complexity and interdependencies
4. Typical GCSE exam weightings

Return ONLY valid JSON in this format:
{
  "priorities": [
    {"topic_name": "string", "priority_score": 1-10, "reasoning": "string"}
  ],
  "difficult_topics": [
    {"topic_name": "string", "reason": "string", "study_suggestion": "string"}
  ]
}`;

    const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY not configured");
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPEN_ROUTER_API_KEY}`,
        "HTTP-Referer": process.env.REPLIT_DEV_DOMAIN || "https://vistari.app"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          { role: "user", content: `${systemPrompt}\n\nAnalyze these GCSE topics that the user finds difficult and assign priority scores:\n\n${topicsList}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    let responseText = aiResult.choices?.[0]?.message?.content || "";

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const analysis = JSON.parse(responseText);
    res.json(analysis);
  } catch (error: any) {
    console.error('Error in analyze-difficulty:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

app.post('/api/parse-topics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { text, subjectName, images } = req.body;

    const systemPrompt = `You are a precise OCR and text extraction assistant. Your job is to read text from images EXACTLY as written.

STRICT RULES:
1. READ the actual text visible in the image - use OCR to extract what is written
2. Copy text EXACTLY as it appears - same spelling, same punctuation, same capitalization
3. DO NOT paraphrase, summarize, or modify the text in any way
4. DO NOT infer or add topics that are not explicitly written in the image
5. If you see numbered items (1, 2, 3...) or bullet points, extract each one exactly

OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "topics": [
    {"name": "exact text from image"},
    {"name": "exact text from image"}
  ]
}

Do NOT include any explanation or commentary - ONLY the JSON.`;

    const messageContent: any[] = [];
    let textContent = `${systemPrompt}\n\nSubject: ${subjectName}\n\n`;
    if (text) {
      textContent += `Extract topics from this text:\n${text}`;
    } else if (images && Array.isArray(images) && images.length > 0) {
      textContent += `IMPORTANT: Carefully read and extract ALL text items/topics visible in this image.`;
    }
    
    messageContent.push({ type: "text", text: textContent });
    
    if (images && Array.isArray(images) && images.length > 0) {
      for (const imageData of images) {
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
          const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            messageContent.push({
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Data}` }
            });
          }
        }
      }
    }

    const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY;
    if (!BYTEZ_API_KEY) {
      throw new Error("AI service not configured");
    }

    const response = await fetch('https://api.bytez.com/models/v2/openai/v1/chat/completions', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": BYTEZ_API_KEY
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway request failed: ${response.status}`);
    }

    const result = await response.json();
    let responseText = result.choices?.[0]?.message?.content || "";

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const parsedTopics = JSON.parse(responseText);
    res.json({ topics: parsedTopics.topics });
  } catch (error: any) {
    console.error('Error in parse-topics:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

app.post('/api/generate-timetable', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { subjects, topics, testDates, preferences, startDate, endDate, homeworks = [], topicAnalysis, aiNotes, events = [], timetableMode } = req.body;
    const userId = req.user!.id;

    const [userPrefs] = await db.select().from(schema.studyPreferences).where(eq(schema.studyPreferences.userId, userId)).limit(1);

    let schoolHoursContext = "";
    if (userPrefs?.schoolStartTime && userPrefs?.schoolEndTime) {
      schoolHoursContext = `
SCHOOL HOURS BLOCKING:
- User attends school EVERY WEEKDAY from ${userPrefs.schoolStartTime} to ${userPrefs.schoolEndTime}
- NEVER schedule study sessions during these times on weekdays
${userPrefs.studyBeforeSchool ? `- Before school study ENABLED (${userPrefs.beforeSchoolStart} - ${userPrefs.beforeSchoolEnd})` : '- Before school study DISABLED'}
${userPrefs.studyDuringLunch ? `- Lunch study ENABLED (${userPrefs.lunchStart} - ${userPrefs.lunchEnd})` : '- Lunch study DISABLED'}
`;
    }

    const subjectsContext = subjects.map((s: any) => `${s.name} (${s.exam_board})`).join("; ");
    const topicsContext = topics.map((t: any) => {
      const subject = subjects.find((s: any) => s.id === t.subject_id);
      return `${t.name} (${subject?.name})`;
    }).join("; ");

    const enabledDays = preferences.day_time_slots?.filter((slot: any) => slot.enabled).map((slot: any) => `${slot.day} (${slot.startTime}-${slot.endTime})`).join(", ") || "All days";

    const eventsContext = events.length > 0 ? events.map((evt: any) => {
      const startDate = new Date(evt.start_time);
      const endDate = new Date(evt.end_time);
      return `BLOCKED: ${evt.title} on ${startDate.toLocaleDateString()} from ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }).join("\n") : "";

    const homeworkContext = homeworks.length > 0 ? homeworks.map((hw: any) => `Homework: "${hw.title}" (${hw.subject}) - Due: ${hw.due_date}, Duration: ${hw.duration || 60} mins`).join("\n") : "";

    const prompt = `You are an expert study timetable generator. Create a realistic, balanced study schedule.

DATE RANGE: ${startDate} to ${endDate}

SUBJECTS: ${subjectsContext}
TOPICS: ${topicsContext}

STUDY PREFERENCES:
- Session Duration: ${preferences.session_duration} minutes
- Break Duration: ${preferences.break_duration} minutes
- Duration Mode: ${preferences.duration_mode}
- Enabled Days: ${enabledDays}

${schoolHoursContext}

${eventsContext ? `BLOCKED EVENTS (DO NOT schedule during these times):\n${eventsContext}` : ''}

${homeworkContext ? `HOMEWORK (Schedule BEFORE due date):\n${homeworkContext}` : ''}

${topicAnalysis?.priorities ? `PRIORITY TOPICS (give more time):\n${JSON.stringify(topicAnalysis.priorities, null, 2)}` : ''}

${aiNotes ? `USER NOTES: ${aiNotes}` : ''}

Generate a JSON schedule with this format:
{
  "schedule": {
    "YYYY-MM-DD": [
      {
        "time": "HH:MM",
        "subject": "Subject Name",
        "topic": "Topic Name",
        "duration": 45,
        "type": "study|homework|revision|break",
        "completed": false
      }
    ]
  },
  "summary": "Brief description of the schedule"
}

CRITICAL RULES:
1. All times must be in HH:MM format (00:00-23:59)
2. Respect the enabled days and time slots from preferences
3. Never schedule during blocked events or school hours
4. Balance topics across days
5. Schedule homework BEFORE due dates (at least 1 day before)
6. Include breaks every 2-3 hours of study`;

    const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY not configured");
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPEN_ROUTER_API_KEY}`,
        "HTTP-Referer": process.env.REPLIT_DEV_DOMAIN || "https://vistari.app"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    let responseText = aiResult.choices?.[0]?.message?.content || "";

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const generatedSchedule = JSON.parse(responseText);

    res.json({
      schedule: generatedSchedule.schedule,
      summary: generatedSchedule.summary || "Timetable generated successfully"
    });
  } catch (error: any) {
    console.error('Error in generate-timetable:', error);
    res.status(500).json({ error: error.message || 'Failed to generate timetable' });
  }
});

app.post('/api/regenerate-tomorrow', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
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
    } = req.body;
    const userId = req.user!.id;

    const [timetable] = await db.select().from(schema.timetables).where(and(eq(schema.timetables.id, timetableId), eq(schema.timetables.userId, userId))).limit(1);

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    const [userPrefs] = await db.select().from(schema.studyPreferences).where(eq(schema.studyPreferences.userId, userId)).limit(1);

    const validTomorrowDate = tomorrowDate || (() => {
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    })();

    const tomorrowDateObj = new Date(validTomorrowDate);
    const tomorrowDayOfWeek = tomorrowDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    let effectiveStartTime = startTime || '09:00';
    let effectiveEndTime = endTime || '17:00';

    if (userPrefs?.dayTimeSlots) {
      const slots = userPrefs.dayTimeSlots as any[];
      const targetSlot = slots.find((slot: any) => slot.day?.toLowerCase() === tomorrowDayOfWeek && slot.enabled);
      if (targetSlot) {
        effectiveStartTime = targetSlot.startTime || effectiveStartTime;
        effectiveEndTime = targetSlot.endTime || effectiveEndTime;
      }
    }

    const sessionDuration = userPrefs?.sessionDuration || 45;
    const breakDuration = userPrefs?.breakDuration || 15;

    const prompt = `You are an expert study schedule generator. Generate a realistic study schedule for tomorrow.

DATE: ${validTomorrowDate} (${tomorrowDayOfWeek})
TIME WINDOW: ${effectiveStartTime} to ${effectiveEndTime}
SESSION DURATION: ${sessionDuration} minutes
BREAK DURATION: ${breakDuration} minutes

STUDENT'S REFLECTION FROM TODAY:
"${reflection || 'No reflection provided'}"

SELECTED TOPICS FOR TOMORROW (ordered by priority):
${JSON.stringify(selectedTopics || [], null, 2)}

DIFFICULT TOPICS (give extra time):
${JSON.stringify(difficultTopics || [], null, 2)}

INCOMPLETE SESSIONS FROM TODAY:
${JSON.stringify(incompleteSessions || [], null, 2)}

Generate a JSON response:
{
  "schedule": [
    {
      "time": "HH:MM",
      "subject": "string",
      "topic": "string",
      "duration": number,
      "type": "study|homework|revision|break",
      "notes": "string",
      "completed": false
    }
  ],
  "summary": "Brief description of the schedule",
  "reasoning": "Why you chose this schedule"
}

RULES:
1. All times must be HH:MM format (00:00-23:59)
2. Schedule 3-5 topics maximum for quality over quantity
3. Prioritize topics by their order in the list
4. Give difficult topics 75-90 minutes, easy topics 45-60 minutes
5. Add strategic breaks (not after every session)`;

    const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY not configured");
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPEN_ROUTER_API_KEY}`,
        "HTTP-Referer": process.env.REPLIT_DEV_DOMAIN || "https://vistari.app"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    let responseText = aiResult.choices?.[0]?.message?.content || "";

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const result = JSON.parse(responseText);

    const [startHour, startMin] = effectiveStartTime.split(':').map(Number);
    const [endHour, endMin] = effectiveEndTime.split(':').map(Number);
    const windowStartMins = startHour * 60 + startMin;
    const windowEndMins = endHour * 60 + endMin;

    const validatedSchedule = (result.schedule || []).filter((session: any) => {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(session.time)) return false;
      
      const [hours, minutes] = session.time.split(':').map(Number);
      const sessionStartMins = hours * 60 + minutes;
      const sessionEndMins = sessionStartMins + (session.duration || 45);
      
      return sessionStartMins >= windowStartMins && sessionEndMins <= windowEndMins;
    });

    res.json({
      schedule: validatedSchedule,
      summary: result.summary || "Tomorrow's schedule generated successfully",
      reasoning: result.reasoning
    });
  } catch (error: any) {
    console.error('Error in regenerate-tomorrow:', error);
    res.status(500).json({ error: error.message || 'Failed to regenerate schedule' });
  }
});

app.post('/api/generate-insights', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { timetableId } = req.body;
    const userId = req.user!.id;

    const reflections = await db.select().from(schema.topicReflections).where(and(eq(schema.topicReflections.timetableId, timetableId), eq(schema.topicReflections.userId, userId)));

    if (!reflections || reflections.length === 0) {
      return res.status(400).json({ error: 'No reflections found', message: 'Complete some study sessions and add reflections first!' });
    }

    const analysisData = reflections.map(r => ({
      subject: r.subject,
      topic: r.topic,
      ...(r.reflectionData as any)
    }));

    const prompt = `You are an educational AI assistant analyzing student study reflections to create a personalized "mindprint".

Here are the reflections from ${reflections.length} study sessions:
${JSON.stringify(analysisData, null, 2)}

Analyze these reflections and provide:
1. Struggling Topics (3-5 topics with low focus/incomplete status)
2. Strong Areas (3-5 topics with high focus/completed status)
3. Learning Patterns
4. Recommended Focus areas
5. Personalized Tips (3-5 actionable tips)
6. Subject Breakdown with confidence scores
7. Peak Study Hours analysis

Return JSON:
{
  "strugglingTopics": [{"topic": "string", "subject": "string", "severity": "high|medium|low", "reason": "string", "avgFocusLevel": number}],
  "strongAreas": [{"topic": "string", "subject": "string", "reason": "string", "avgFocusLevel": number}],
  "learningPatterns": ["string"],
  "recommendedFocus": ["string"],
  "personalizedTips": ["string"],
  "subjectBreakdown": {"SubjectName": {"confidenceScore": number, "summary": "string"}},
  "peakStudyHours": {"bestTimeWindow": "morning|afternoon|evening", "recommendation": "string"},
  "overallSummary": "string"
}`;

    const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY not configured");
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPEN_ROUTER_API_KEY}`,
        "HTTP-Referer": process.env.REPLIT_DEV_DOMAIN || "https://vistari.app"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    let responseText = aiResult.choices?.[0]?.message?.content || "";

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const insights = JSON.parse(responseText);

    await db.insert(schema.studyInsights).values({
      userId,
      timetableId,
      insightsData: insights,
    }).onConflictDoUpdate({
      target: [schema.studyInsights.userId, schema.studyInsights.timetableId],
      set: { insightsData: insights }
    });

    res.json({ insights });
  } catch (error: any) {
    console.error('Error in generate-insights:', error);
    res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
});

app.post('/api/analyze-test-score', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { scoreId, subject, percentage, correctQuestions, incorrectQuestions, testType } = req.body;
    const userId = req.user!.id;

    const prompt = `Analyze this GCSE test performance:

Subject: ${subject}
Test Type: ${testType}
Score: ${percentage.toFixed(1)}%

Correct Questions: ${JSON.stringify(correctQuestions)}
Incorrect Questions: ${JSON.stringify(incorrectQuestions)}

Provide analysis as JSON:
{
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

    const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPEN_ROUTER_API_KEY}`,
        "HTTP-Referer": process.env.REPLIT_DEV_DOMAIN || "https://vistari.app"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    let responseText = aiResult.choices?.[0]?.message?.content || "";

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const analysis = JSON.parse(responseText);

    await db.update(schema.testScores).set({
      aiAnalysis: analysis,
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      recommendations: analysis.recommendations || [],
    }).where(and(eq(schema.testScores.id, scoreId), eq(schema.testScores.userId, userId)));

    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Error in analyze-test-score:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze test score' });
  }
});

app.post('/api/adjust-schedule', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { timetableId, currentDate, reflection, completedSessionIndices, incompleteSessions } = req.body;
    const userId = req.user!.id;

    const [timetable] = await db.select().from(schema.timetables).where(and(eq(schema.timetables.id, timetableId), eq(schema.timetables.userId, userId))).limit(1);

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    const schedule = timetable.schedule as Record<string, any[]>;
    const currentDateObj = new Date(currentDate);
    const endDate = new Date(timetable.endDate);

    const futureDates = Object.keys(schedule).filter(date => {
      const d = new Date(date);
      return d > currentDateObj && d <= endDate;
    }).sort();

    if (futureDates.length === 0 || !incompleteSessions?.length) {
      return res.json({ message: 'No adjustments needed', updatedSchedule: schedule });
    }

    const prompt = `Reorganize this study schedule based on student feedback.

Current Date: ${currentDate}
Student's Reflection: "${reflection || 'No reflection'}"

Incomplete Sessions: ${JSON.stringify(incompleteSessions)}

Future Schedule (next 7 days):
${JSON.stringify(futureDates.slice(0, 7).map(date => ({ date, sessions: schedule[date] || [] })), null, 2)}

Return JSON:
{
  "rescheduledSessions": {
    "YYYY-MM-DD": [{"time": "HH:MM", "subject": "string", "topic": "string", "duration": number, "type": "study", "notes": "string"}]
  },
  "sessionsToRemove": {"YYYY-MM-DD": [0, 2]},
  "summary": "What changes were made",
  "reasoning": "Why these changes"
}`;

    const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPEN_ROUTER_API_KEY}`,
        "HTTP-Referer": process.env.REPLIT_DEV_DOMAIN || "https://vistari.app"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    let responseText = aiResult.choices?.[0]?.message?.content || "";

    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const result = JSON.parse(responseText);
    const updatedSchedule = { ...schedule };

    if (result.sessionsToRemove) {
      Object.entries(result.sessionsToRemove).forEach(([date, indices]: [string, any]) => {
        if (updatedSchedule[date]) {
          const sortedIndices = (indices as number[]).sort((a, b) => b - a);
          sortedIndices.forEach(index => {
            updatedSchedule[date].splice(index, 1);
          });
        }
      });
    }

    if (result.rescheduledSessions) {
      Object.entries(result.rescheduledSessions).forEach(([date, sessions]: [string, any]) => {
        if (!updatedSchedule[date]) {
          updatedSchedule[date] = [];
        }
        (sessions as any[]).forEach((session: any) => {
          updatedSchedule[date].push({
            ...session,
            completed: false
          });
        });
        updatedSchedule[date].sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
      });
    }

    await db.update(schema.timetables).set({ schedule: updatedSchedule }).where(eq(schema.timetables.id, timetableId));

    res.json({
      success: true,
      rescheduledSessions: result.rescheduledSessions,
      summary: result.summary || 'Schedule updated',
      updatedSchedule
    });
  } catch (error: any) {
    console.error('Error in adjust-schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to adjust schedule' });
  }
});

app.get('/api/timetables', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const timetables = await db.select().from(schema.timetables).where(eq(schema.timetables.userId, req.user!.id)).orderBy(desc(schema.timetables.createdAt));
    res.json(timetables);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/timetables', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [timetable] = await db.insert(schema.timetables).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.json(timetable);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/timetables/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [timetable] = await db.update(schema.timetables).set(req.body).where(and(eq(schema.timetables.id, req.params.id), eq(schema.timetables.userId, req.user!.id))).returning();
    res.json(timetable);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/timetables/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await db.delete(schema.timetables).where(and(eq(schema.timetables.id, req.params.id), eq(schema.timetables.userId, req.user!.id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/subjects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await db.select().from(schema.subjects).where(eq(schema.subjects.userId, req.user!.id));
    res.json(subjects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subjects', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [subject] = await db.insert(schema.subjects).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.json(subject);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/homeworks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const homeworks = await db.select().from(schema.homeworks).where(eq(schema.homeworks.userId, req.user!.id)).orderBy(schema.homeworks.dueDate);
    res.json(homeworks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/homeworks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [homework] = await db.insert(schema.homeworks).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.json(homework);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/homeworks/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [homework] = await db.update(schema.homeworks).set(req.body).where(and(eq(schema.homeworks.id, req.params.id), eq(schema.homeworks.userId, req.user!.id))).returning();
    res.json(homework);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/homeworks/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await db.delete(schema.homeworks).where(and(eq(schema.homeworks.id, req.params.id), eq(schema.homeworks.userId, req.user!.id)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const events = await db.select().from(schema.events).where(eq(schema.events.userId, req.user!.id)).orderBy(schema.events.startTime);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [event] = await db.insert(schema.events).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profiles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, req.user!.id)).limit(1);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profiles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [profile] = await db.update(schema.profiles).set(req.body).where(eq(schema.profiles.userId, req.user!.id)).returning();
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/study-preferences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [prefs] = await db.select().from(schema.studyPreferences).where(eq(schema.studyPreferences.userId, req.user!.id)).limit(1);
    res.json(prefs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/study-preferences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [prefs] = await db.update(schema.studyPreferences).set(req.body).where(eq(schema.studyPreferences.userId, req.user!.id)).returning();
    res.json(prefs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/topic-reflections', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const reflections = await db.select().from(schema.topicReflections).where(eq(schema.topicReflections.userId, req.user!.id)).orderBy(desc(schema.topicReflections.createdAt));
    res.json(reflections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/topic-reflections', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [reflection] = await db.insert(schema.topicReflections).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.json(reflection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/study-insights/:timetableId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [insights] = await db.select().from(schema.studyInsights).where(and(eq(schema.studyInsights.timetableId, req.params.timetableId), eq(schema.studyInsights.userId, req.user!.id))).limit(1);
    res.json(insights);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user-role', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [role] = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, req.user!.id)).limit(1);
    res.json(role || { role: 'free' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/study-streaks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const streaks = await db.select().from(schema.studyStreaks).where(eq(schema.studyStreaks.userId, req.user!.id)).orderBy(desc(schema.studyStreaks.date));
    res.json(streaks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/study-streaks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [streak] = await db.insert(schema.studyStreaks).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.json(streak);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.NODE_ENV === 'development' ? 3000 : 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
