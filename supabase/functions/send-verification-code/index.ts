import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCodeRequest {
  email: string;
}

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SendCodeRequest = await req.json();
    
    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[send-verification-code] Processing request for:", email);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for rate limiting - max 3 codes per email in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentCodes, error: countError } = await supabase
      .from("email_verifications")
      .select("id")
      .eq("email", email.toLowerCase())
      .gte("created_at", tenMinutesAgo);

    if (countError) {
      console.error("[send-verification-code] Rate limit check error:", countError);
    }

    if (recentCodes && recentCodes.length >= 3) {
      console.log("[send-verification-code] Rate limit exceeded for:", email);
      return new Response(
        JSON.stringify({ 
          error: "Too many verification requests. Please wait a few minutes before trying again." 
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 6-digit code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log("[send-verification-code] Generated code for:", email);

    // Delete any existing unverified codes for this email
    await supabase
      .from("email_verifications")
      .delete()
      .eq("email", email.toLowerCase())
      .eq("verified", false);

    // Store the code in database
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0
      });

    if (insertError) {
      console.error("[send-verification-code] Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "Vistari <onboarding@resend.dev>",
      to: [email],
      subject: "Your Vistari Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Vistari</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Email Verification</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin-top: 0;">Hi there! 👋</p>
            <p>You're almost ready to start using Vistari. Enter this verification code to complete your sign-up:</p>
            
            <div style="background: white; border: 2px solid #8B5CF6; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #8B5CF6;">${code}</span>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0; text-align: center;">
              © ${new Date().getFullYear()} Vistari - AI-Powered Revision Timetables
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("[send-verification-code] Email send error:", emailError);
      // Delete the code if email failed
      await supabase
        .from("email_verifications")
        .delete()
        .eq("email", email.toLowerCase())
        .eq("code", code);
      
      // Check if it's a Resend testing mode limitation
      const errorObj = emailError as any;
      const errorMessage = errorObj.message || "";
      if (errorObj.statusCode === 403 || errorMessage.includes("testing emails") || errorMessage.includes("verify a domain")) {
        return new Response(
          JSON.stringify({ error: "Email verification is currently in testing mode. Please contact support or use an approved email address." }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
        
      return new Response(
        JSON.stringify({ error: "Failed to send verification email. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[send-verification-code] Email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[send-verification-code] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
