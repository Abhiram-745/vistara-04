import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { scoreId, subject, percentage, correctQuestions, incorrectQuestions, testType } = await req.json();

    // Build AI analysis prompt
    const prompt = `Analyze this GCSE test performance and provide actionable insights:

**Subject**: ${subject}
**Test Type**: ${testType}
**Score**: ${percentage.toFixed(1)}%

**Questions Answered Correctly**:
${correctQuestions.map((q: any, i: number) => `${i + 1}. ${q.question}`).join('\n') || 'No details provided'}

**Questions Answered Incorrectly**:
${incorrectQuestions.map((q: any, i: number) => `${i + 1}. ${q.question}`).join('\n') || 'No details provided'}

Please provide:
1. **Strengths** (3-5 points): What topics/skills did the student demonstrate mastery in?
2. **Weaknesses** (3-5 points): What specific topics need more work? Be specific about concepts.
3. **Recommendations** (3-5 actionable steps): What should the student do to improve? Include specific study strategies, resources, and practice suggestions.

Be constructive, specific, and focused on GCSE exam success. Return ONLY valid JSON in this format:
{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`;

    console.log("Calling AI for test score analysis...");

    const systemPrompt = "You are an expert GCSE tutor analyzing student test performance. Provide specific, actionable feedback. Always return valid JSON.";

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
          model: "x-ai/grok-4.1-fast:free",
          messages: [
            { role: "user", content: `${systemPrompt}\n\n${prompt}` }
          ],
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const openaiResult = await response.json();
    console.log("OpenAI response:", JSON.stringify(openaiResult, null, 2));

    // Extract content from OpenAI response
    let responseText: string | undefined;
    if (openaiResult.choices?.[0]?.message?.content) {
      responseText = openaiResult.choices[0].message.content;
    }

    if (!responseText || responseText.trim() === "") {
      console.error("Empty AI response. Raw result:", JSON.stringify(openaiResult, null, 2));
      throw new Error("AI did not generate a response. Please try again.");
    }

    // Extract JSON from markdown if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    }

    const analysis = JSON.parse(responseText);

    // Update test score with AI analysis
    const { error: updateError } = await supabase
      .from("test_scores")
      .update({
        ai_analysis: analysis,
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        recommendations: analysis.recommendations || [],
      })
      .eq("id", scoreId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    console.log("Test score analysis completed successfully");

    return new Response(JSON.stringify({
      success: true,
      analysis,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-test-score:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
