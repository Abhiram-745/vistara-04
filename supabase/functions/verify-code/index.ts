import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyCodeRequest = await req.json();
    
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[verify-code] Verifying code for:", email);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the verification record
    const { data: verification, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[verify-code] Database fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!verification) {
      console.log("[verify-code] No verification record found for:", email);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "No verification code found. Please request a new code." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if code has expired
    if (new Date(verification.expires_at) < new Date()) {
      console.log("[verify-code] Code expired for:", email);
      // Delete expired code
      await supabase
        .from("email_verifications")
        .delete()
        .eq("id", verification.id);
        
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Verification code has expired. Please request a new code." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check attempt count (max 5 attempts)
    if (verification.attempts >= 5) {
      console.log("[verify-code] Too many attempts for:", email);
      // Delete the code after too many attempts
      await supabase
        .from("email_verifications")
        .delete()
        .eq("id", verification.id);
        
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Too many incorrect attempts. Please request a new code." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if code matches
    if (verification.code !== code) {
      console.log("[verify-code] Invalid code attempt for:", email);
      // Increment attempt counter
      await supabase
        .from("email_verifications")
        .update({ attempts: verification.attempts + 1 })
        .eq("id", verification.id);
        
      const remainingAttempts = 5 - (verification.attempts + 1);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.` 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Code is valid - mark as verified
    console.log("[verify-code] Code verified successfully for:", email);
    await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    return new Response(
      JSON.stringify({ valid: true, message: "Email verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[verify-code] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
