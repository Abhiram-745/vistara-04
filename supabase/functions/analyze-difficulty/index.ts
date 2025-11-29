import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topics, focusTopics } = await req.json();

    // Format topics for AI analysis, including user's difficulty notes
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

The user has specifically selected these as focus topics because they struggle with them. Pay close attention to any notes they've provided about WHY they struggle.

Provide a priority score (1-10) for each topic where 10 means highest priority for study time allocation.

Return ONLY valid JSON in this format:
{
  "priorities": [
    {"topic_name": "string", "priority_score": 1-10, "reasoning": "string"}
  ],
  "difficult_topics": [
    {"topic_name": "string", "reason": "string", "study_suggestion": "string"}
  ]
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
            { role: "user", content: `${systemPrompt}\n\nAnalyze these GCSE topics that the user finds difficult and assign priority scores:\n\n${topicsList}` }
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log('AI response:', JSON.stringify(aiResult, null, 2));

    // Extract content from response
    let responseText: string | undefined;
    if (aiResult.choices?.[0]?.message?.content) {
      responseText = aiResult.choices[0].message.content;
    }

    if (!responseText || responseText.trim() === "") {
      console.error('Empty AI response. Raw result:', JSON.stringify(aiResult, null, 2));
      throw new Error('AI did not generate a response. Please try again.');
    }

    // Extract JSON from markdown if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const analysis = JSON.parse(responseText);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-difficulty:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
