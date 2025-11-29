# Vistari - GCSE Study Planning Application

## Overview
Vistari is a GCSE revision planner that creates personalized study timetables that fit around student schedules. Originally built on Lovable, migrated to Replit with dual AI provider integration.

## Recent Changes
**November 29, 2025 - Dual AI Provider Setup**
- Configured Bytez API with Gemini 2.5 Pro for image-based topic parsing and complex timetable generation
- Configured Open Router with Mistral 7B for schedule adjustments, analysis, and other AI features
- All edge functions use server-side secret management (Deno.env.get)
- API keys are stored securely as Supabase secrets (not passed through frontend)

## ⚠️ CRITICAL SETUP REQUIREMENTS

**You must set two API keys as Supabase secrets:**

1. **BYTEZ_API_KEY** (for image parsing and timetable generation)
   - Go to your Supabase project dashboard
   - Navigate to Settings → Secrets
   - Create a secret named `BYTEZ_API_KEY`
   - Value: `840ecbd12ca7f2cfd93354ebb304535e`

2. **OPEN_ROUTER_API_KEY** (for schedule adjustments and analysis)
   - Already configured
   - Value: Uses free Mistral 7B model via Open Router

**Without these secrets, AI features will fail.**

## AI Configuration

### Bytez API (Image-Based AI)
- **Provider**: Bytez (bytez.com)
- **Model**: Google Gemini 2.5 Pro
- **Used for**: 
  - Topic extraction from images (parse-topics function)
  - Complex timetable generation (generate-timetable function)
- **Secret**: `BYTEZ_API_KEY`

### Open Router API (Text-Based AI)
- **Provider**: Open Router (openrouter.ai)
- **Model**: Mistral 7B Instruct (mistralai/mistral-7b-instruct:free)
- **Used for**: 
  - Schedule adjustments (adjust-schedule)
  - Tomorrow's schedule planning (regenerate-tomorrow)
  - Test score analysis (analyze-test-score)
  - Learning insights generation (generate-insights)
  - Email validation (validate-email)
  - Topic difficulty analysis (analyze-difficulty)
- **Secret**: `OPEN_ROUTER_API_KEY`

## Edge Functions (supabase/functions/)
1. **parse-topics** - Extracts topics from images (Bytez + Gemini 2.5 Pro)
2. **generate-timetable** - Creates personalized study schedules (Bytez + Gemini 2.5 Pro)
3. **adjust-schedule** - Modifies schedules based on user requests (Open Router + Mistral 7B)
4. **regenerate-tomorrow** - Regenerates next day's schedule (Open Router + Mistral 7B)
5. **analyze-test-score** - Provides feedback on test performance (Open Router + Mistral 7B)
6. **generate-insights** - Creates learning analytics and insights (Open Router + Mistral 7B)
7. **validate-email** - AI-assisted email validation (Open Router + Mistral 7B)
8. **analyze-difficulty** - Analyzes topic difficulty and priorities (Open Router + Mistral 7B)

## Project Structure
- `/client` - React frontend with Vite
- `/server` - Express backend
- `/supabase/functions` - Edge functions with dual AI provider integration
- `/shared` - Shared types and schemas

## Running the Project
The workflow "Start application" runs `npm run dev` which starts both frontend and backend on port 5000.

## User Preferences
- Dual AI approach: Gemini 2.5 Pro for complex image/schedule tasks, Mistral 7B for faster text analysis
- Security-first: All API keys stored on server, never passed through frontend
- Cost optimization: Using free tier models where possible

## Technical Notes
- All Deno edge functions access secrets via `Deno.env.get()`
- Bytez API endpoint: `https://api.bytez.com/models/v2/openai/v1/chat/completions`
- Open Router endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Frontend never receives or stores API keys
- Application is production-ready after both Supabase secrets are configured
