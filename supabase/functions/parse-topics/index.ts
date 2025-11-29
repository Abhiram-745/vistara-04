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
    const { text, subjectName, images } = await req.json();

    const systemPrompt = `You are a precise OCR and text extraction assistant. Your job is to read text from images EXACTLY as written.

STRICT RULES:
1. READ the actual text visible in the image - use OCR to extract what is written
2. Copy text EXACTLY as it appears - same spelling, same punctuation, same capitalization
3. DO NOT paraphrase, summarize, or modify the text in any way
4. DO NOT infer or add topics that are not explicitly written in the image
5. If you see numbered items (1, 2, 3...) or bullet points, extract each one exactly
6. If you see checkboxes or tick marks, extract the text next to each one
7. Ignore headers like "Topics to revise" or "Checklist" - only extract the actual topic items

OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "topics": [
    {"name": "exact text from image"},
    {"name": "exact text from image"}
  ]
}

Do NOT include any explanation or commentary - ONLY the JSON.`;

    // Build multimodal message content
    const messageContent: any[] = [];
    
    // Add instruction and subject context
    let textContent = `${systemPrompt}\n\nSubject: ${subjectName}\n\n`;
    if (text) {
      textContent += `Extract topics from this text:\n${text}`;
    } else if (images && Array.isArray(images) && images.length > 0) {
      textContent += `IMPORTANT: Carefully read and extract ALL text items/topics visible in this image. Use OCR to read every single line of text that represents a topic or item to study.`;
    }
    
    messageContent.push({ type: "text", text: textContent });
    
    // Add images if provided (Gemini 2.0 Flash supports vision)
    if (images && Array.isArray(images) && images.length > 0) {
      console.log(`Processing ${images.length} image(s) for topic extraction`);
      
      for (const imageData of images) {
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
          // Parse base64 data URL
          const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            messageContent.push({
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            });
          }
        } else if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
          // Direct URL
          messageContent.push({
            type: "image_url",
            image_url: {
              url: imageData
            }
          });
        }
      }
    }

    // Using Bytez API with Gemini 2.5 Flash for image extraction
    const BYTEZ_API_KEY = Deno.env.get('BYTEZ_API_KEY');
    
    if (!BYTEZ_API_KEY) {
      console.error("BYTEZ_API_KEY not configured");
      throw new Error("AI service not configured. Please contact support.");
    }

    console.log(`Calling Bytez API with ${messageContent.length} content parts (${images?.length || 0} images)`);

    const response = await fetch(
      'https://api.bytez.com/models/v2/openai/v1/chat/completions',
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": BYTEZ_API_KEY
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: messageContent }
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

    const openaiResult = await response.json();
    console.log('Bytez Gemini response:', JSON.stringify(openaiResult, null, 2));

    // Extract content from response
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

    const parsedTopics = JSON.parse(responseText);

    return new Response(JSON.stringify({ topics: parsedTopics.topics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in parse-topics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
