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

    const { timetableId } = await req.json();

    // Fetch all reflections for this timetable
    const { data: reflections, error: reflectionsError } = await supabase
      .from('topic_reflections')
      .select('*')
      .eq('timetable_id', timetableId)
      .eq('user_id', user.id);

    if (reflectionsError) {
      console.error('Error fetching reflections:', reflectionsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch reflections' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!reflections || reflections.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No reflections found',
        message: 'Complete some study sessions and add reflections first!' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for AI analysis
    const analysisData = reflections.map(r => ({
      subject: r.subject,
      topic: r.topic,
      howItWent: r.reflection_data.howItWent || '',
      focusLevel: r.reflection_data.focusLevel || 0,
      completionStatus: r.reflection_data.completionStatus || 'yes',
      whatMissed: r.reflection_data.whatMissed || '',
      quickNote: r.reflection_data.quickNote || '',
      timeOfDay: r.reflection_data.timeOfDay || 'unknown',
      duration: r.reflection_data.duration || 0,
    }));

    const prompt = `You are an educational AI assistant analyzing student study reflections to create a personalized "mindprint" - a comprehensive overview of their learning strengths, challenges, and patterns.

Here are the reflections from ${reflections.length} study sessions:

${JSON.stringify(analysisData, null, 2)}

Each reflection contains:
- howItWent: Student's description of how the session went
- focusLevel: 0-100 scale (higher = more focused)
- completionStatus: "yes" (completed), "partially" (partially completed), "no" (not completed at all)
- whatMissed: What they didn't complete (if status is partially/no)
- quickNote: Brief note about challenges or observations
- timeOfDay: When the session occurred (HH:MM format)
- duration: Session duration in minutes

Analyze these reflections and provide:

1. **Struggling Topics**: Identify 3-5 topics where the student is experiencing the most difficulty (low focusLevel <50, not completed, mentions challenges). Include specific quotes from their reflections.

2. **Strong Areas**: Identify 3-5 topics where the student excels or feels confident (high focusLevel >70, completed, positive howItWent). Include specific quotes.

3. **Learning Patterns**: What patterns do you notice in how they learn? (e.g., loses focus on certain topics, struggles to complete longer sessions, patterns in missed content)

4. **Recommended Focus**: What should they prioritize in upcoming study sessions based on incomplete topics and low focus areas?

5. **Personalized Tips**: 3-5 specific, actionable tips tailored to their focus patterns and completion challenges.

6. **Subject Breakdown**: For each subject, provide a confidence score (1-10 based on average focusLevel and completion rates) and brief summary.

7. **Peak Study Hours**: Analyze the timeOfDay data and completionStatus to identify when the student studies most effectively:
   - Identify time windows (morning 06:00-11:59, afternoon 12:00-17:59, evening 18:00-23:59) with highest completion rates and focus levels
   - Calculate average focus level per time window
   - Identify patterns: when do they struggle most vs when do they perform best?
   - Provide specific time recommendations for difficult vs easy topics

Format your response as JSON with this structure:
{
  "strugglingTopics": [
    { "topic": "string", "subject": "string", "severity": "high|medium|low", "reason": "string", "quotes": ["string"], "avgFocusLevel": number }
  ],
  "strongAreas": [
    { "topic": "string", "subject": "string", "reason": "string", "quotes": ["string"], "avgFocusLevel": number }
  ],
  "learningPatterns": ["string"],
  "recommendedFocus": ["string"],
  "personalizedTips": ["string"],
  "subjectBreakdown": {
    "SubjectName": {
      "confidenceScore": number,
      "summary": "string",
      "topicsCount": number
    }
  },
  "peakStudyHours": {
    "bestTimeWindow": "morning|afternoon|evening",
    "bestTimeRange": "HH:MM-HH:MM",
    "worstTimeWindow": "morning|afternoon|evening",
    "worstTimeRange": "HH:MM-HH:MM",
    "completionRateByWindow": {
      "morning": number,
      "afternoon": number,
      "evening": number
    },
    "avgDifficultyByWindow": {
      "morning": number,
      "afternoon": number,
      "evening": number
    },
    "recommendation": "string describing when to schedule hard vs easy topics"
  },
  "overallSummary": "string"
}`;

    const OPEN_ROUTER_API_KEY = Deno.env.get('OPEN_ROUTER_API_KEY');
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error("OPEN_ROUTER_API_KEY not configured");
    }

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
            { role: "user", content: `You are an expert educational analyst who creates personalized learning insights.\n\n${prompt}` }
          ],
          max_tokens: 4096,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const openaiResult = await response.json();
    console.log('OpenAI response:', JSON.stringify(openaiResult, null, 2));

    // Extract content from OpenAI response
    let insightsText: string | undefined;
    if (openaiResult.choices?.[0]?.message?.content) {
      insightsText = openaiResult.choices[0].message.content;
    }

    if (!insightsText || insightsText.trim() === "") {
      console.error('Empty AI response. Raw result:', JSON.stringify(openaiResult, null, 2));
      throw new Error('AI did not generate a response. Please try again.');
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = insightsText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      insightsText = jsonMatch[1];
    }

    const insights = JSON.parse(insightsText);

    // Save insights to database
    const { error: upsertError } = await supabase
      .from('study_insights')
      .upsert({
        user_id: user.id,
        timetable_id: timetableId,
        insights_data: insights,
      }, {
        onConflict: 'user_id,timetable_id'
      });

    if (upsertError) {
      console.error('Error saving insights:', upsertError);
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
