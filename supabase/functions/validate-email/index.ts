import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// List of known disposable email domains (backup list)
const DISPOSABLE_DOMAINS = [
  "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com",
  "throwaway.email", "fakeinbox.com", "maildrop.cc", "yopmail.com",
  "temp-mail.org", "getnada.com", "mohmal.com", "dispostable.com",
  "trashmail.com", "mailnesia.com", "tempr.email", "tempail.com",
  "mytemp.email", "sharklasers.com", "guerrillamail.info", "spam4.me",
  "grr.la", "mailcatch.com", "tempinbox.com", "emailondeck.com",
  "fakemail.net", "mintemail.com", "spamgourmet.com", "mailexpire.com",
  "throwawaymail.com", "jetable.org", "trash-mail.com", "tmpmail.net",
  "tmpmail.org", "anonymbox.com", "tempomail.fr", "spamfree24.org",
  "dropmail.me", "mailsac.com", "inboxalias.com", "tmail.ws",
  "emkei.cz", "33mail.com", "spambog.com", "mailforspam.com",
  "crazymailing.com", "tempsky.com", "mail-temp.com", "fakemailgenerator.com",
];

// Suspicious patterns in email addresses
const SUSPICIOUS_PATTERNS = [
  /^[a-z0-9]{20,}@/, // 20+ random chars
  /^\d{8,}@/, // 8+ digits
  /test\d{3,}@/, // test + 3+ digits
  /^[a-z]{1,2}\d{5,}@/, // 1-2 letters + 5+ digits
  /^temp[_-]?\d+@/, // temp + digits
  /fake[_-]?\d+@/, // fake + digits
  /spam\d*@/, // spam + optional digits
  /^x{3,}/, // xxx... at start
  /^[qwerty]{6,}/, // keyboard patterns
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, checkBan } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ isValid: false, reason: "No email provided", confidence: 100, flags: ["missing_email"] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const domain = emailLower.split("@")[1];
    const localPart = emailLower.split("@")[0];
    const flags: string[] = [];
    let confidence = 100;

    // Initialize Supabase client to check banned users
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email is banned
    const { data: bannedUser, error: banError } = await supabase
      .from("banned_users")
      .select("id, reason")
      .eq("email", emailLower)
      .maybeSingle();

    if (banError) {
      console.error("[validate-email] Error checking banned users:", banError);
    }

    if (bannedUser) {
      console.log(`[validate-email] Banned email detected: ${emailLower}`);
      return new Response(
        JSON.stringify({
          isValid: false,
          isBanned: true,
          reason: "This email has been banned. Please contact support if you believe this is an error.",
          confidence: 100,
          flags: ["banned_email"]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If only checking ban status, return early
    if (checkBan) {
      return new Response(
        JSON.stringify({
          isValid: true,
          isBanned: false,
          reason: "Email is not banned",
          confidence: 100,
          flags: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check disposable domain (backup list)
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      console.log(`[validate-email] Disposable domain detected (backup list): ${domain}`);
      return new Response(
        JSON.stringify({
          isValid: false,
          isBanned: false,
          reason: "Disposable email addresses are not allowed. Please use a permanent email address.",
          confidence: 100,
          flags: ["disposable_domain"]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(localPart) || pattern.test(emailLower)) {
        flags.push("suspicious_pattern");
        confidence -= 30;
        break;
      }
    }

    // Check for very short local part
    if (localPart.length < 3) {
      flags.push("short_local_part");
      confidence -= 20;
    }

    // Check for uncommon TLDs that are often used for temp emails
    const suspiciousTLDs = [".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".click"];
    if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
      flags.push("suspicious_tld");
      confidence -= 25;
    }

    // Use API Ninjas for email validation (100k+ disposable domain database)
    const API_NINJAS_KEY = Deno.env.get("API_NINJAS_KEY");
    
    if (API_NINJAS_KEY) {
      try {
        // 1. Check if disposable email using API Ninjas (large database of 100k+ domains)
        console.log(`[validate-email] Calling API Ninjas disposable check for: ${emailLower}`);
        const disposableResponse = await fetch(
          `https://api.api-ninjas.com/v1/disposableemailchecker?email=${encodeURIComponent(emailLower)}`,
          { headers: { "X-Api-Key": API_NINJAS_KEY } }
        );

        if (disposableResponse.ok) {
          const disposableData = await disposableResponse.json();
          console.log(`[validate-email] API Ninjas disposable response:`, JSON.stringify(disposableData));
          
          if (disposableData.is_disposable === true) {
            console.log(`[validate-email] API Ninjas detected disposable email: ${emailLower}`);
            return new Response(
              JSON.stringify({
                isValid: false,
                isBanned: false,
                reason: "Disposable email addresses are not allowed. Please use a permanent email address.",
                confidence: 100,
                flags: ["disposable_email"]
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.error(`[validate-email] API Ninjas disposable check error: ${disposableResponse.status}`);
        }

        // 2. Validate email format and DNS using API Ninjas
        console.log(`[validate-email] Calling API Ninjas validate for: ${emailLower}`);
        const validateResponse = await fetch(
          `https://api.api-ninjas.com/v1/validateemail?email=${encodeURIComponent(emailLower)}`,
          { headers: { "X-Api-Key": API_NINJAS_KEY } }
        );

        if (validateResponse.ok) {
          const validateData = await validateResponse.json();
          console.log(`[validate-email] API Ninjas validate response:`, JSON.stringify(validateData));
          
          // Check if email is valid
          if (validateData.is_valid === false) {
            console.log(`[validate-email] API Ninjas detected invalid email: ${emailLower}`);
            return new Response(
              JSON.stringify({
                isValid: false,
                isBanned: false,
                reason: "This email address appears to be invalid. Please check and try again.",
                confidence: 100,
                flags: ["invalid_email"]
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          // Check DNS/MX records
          if (validateData.is_mx_found === false) {
            flags.push("no_mx_records");
            confidence -= 30;
            console.log(`[validate-email] No MX records for: ${emailLower}`);
          }

          // Check if it's a free email provider (not necessarily bad, just flag it)
          if (validateData.is_free === true) {
            console.log(`[validate-email] Free email provider: ${emailLower}`);
          }

          // Check if SMTP is valid
          if (validateData.is_smtp_valid === false) {
            flags.push("smtp_invalid");
            confidence -= 25;
            console.log(`[validate-email] SMTP invalid for: ${emailLower}`);
          }

        } else {
          console.error(`[validate-email] API Ninjas validate error: ${validateResponse.status}`);
        }

      } catch (apiError) {
        console.error("[validate-email] API Ninjas error:", apiError);
      }
    } else {
      console.log("[validate-email] API Ninjas key not configured, skipping external validation");
    }

    // Use Open Router AI for deeper analysis if flags exist and confidence is borderline
    if (flags.length > 0 && confidence > 40 && confidence < 70) {
      const OPEN_ROUTER_API_KEY = Deno.env.get("OPEN_ROUTER_API_KEY");
      
      if (OPEN_ROUTER_API_KEY) {
        try {
          const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPEN_ROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": Deno.env.get('SUPABASE_URL') || "https://vistari.app"
            },
            body: JSON.stringify({
              model: "mistralai/mistral-7b-instruct:free",
              messages: [
                {
                  role: "user",
                  content: `You are an email validation AI. Analyze if this email looks like a real person's email or a fake/temporary email created just for signing up. Consider:
1. Does the local part look like a real name or random characters?
2. Is the domain a well-known email provider or suspicious?
3. Are there patterns suggesting automation or spam?

Respond with JSON only: {"isFake": boolean, "reason": "brief explanation"}

Analyze this email: ${emailLower}`
                }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                if (analysis.isFake) {
                  flags.push("ai_detected_fake");
                  confidence -= 40;
                }
              }
            } catch (parseError) {
              console.log("[validate-email] Could not parse AI response:", parseError);
            }
          }
        } catch (aiError) {
          console.error("[validate-email] AI analysis error:", aiError);
        }
      }
    }

    // Final determination
    const isValid = confidence > 40;
    
    console.log(`[validate-email] Result for ${emailLower}: valid=${isValid}, confidence=${confidence}, flags=${flags.join(",")}`);

    return new Response(
      JSON.stringify({
        isValid,
        isBanned: false,
        reason: isValid 
          ? "Email appears legitimate" 
          : "This email address appears to be invalid or suspicious. Please use a valid email address.",
        confidence,
        flags
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[validate-email] Error:", error);
    return new Response(
      JSON.stringify({ isValid: true, isBanned: false, reason: "Validation error, allowing email", confidence: 50, flags: ["error"] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
