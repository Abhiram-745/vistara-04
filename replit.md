# Vistari - GCSE Study Planning Application

## Overview
Vistari is a GCSE revision planner that creates personalized study timetables that fit around student schedules. Built with React frontend and Express backend, using Neon Postgres database with Drizzle ORM.

## Recent Changes
**November 29, 2025 - Email Verification Migration**
- Migrated email verification from Supabase Edge Functions to Express server endpoints
- Added Resend API integration for sending verification emails (domain: vistara-ai.app)
- Updated AuthContext to use Express server endpoints instead of Supabase auth
- Email verification endpoints: /api/send-verification-code, /api/verify-code, /api/check-email-verified/:email

**November 29, 2025 - Database Migration**
- Migrated from Supabase to Neon Postgres database
- Using Drizzle ORM for database operations
- All tables pushed and operational: users, profiles, timetables, homeworks, events, study_sessions, achievements, study_groups, email_verifications, etc.

## Architecture

### Backend (Express Server)
- **Auth endpoints**: /api/auth/signup, /api/auth/login, /api/auth/user
- **Email verification**: /api/send-verification-code, /api/verify-code, /api/check-email-verified
- **Study features**: timetables, homeworks, events, study sessions, topics, subjects
- **Social features**: study groups, leaderboards, group achievements

### Database (Neon Postgres)
- Connection via DATABASE_URL environment variable
- Schema managed with Drizzle ORM in shared/schema.ts
- Push schema updates with: `npm run db:push`

### Frontend (React + Vite)
- React with TypeScript
- Tailwind CSS + shadcn/ui components
- AuthContext for authentication state management
- API calls to Express backend

## Environment Variables Required
- `DATABASE_URL` - Neon Postgres connection string
- `RESEND_API_KEY` - For sending verification emails
- `JWT_SECRET` - For token signing (optional, has default)
- `BYTEZ_API_KEY` - For image-based AI features
- `OPEN_ROUTER_API_KEY` - For text-based AI features

## AI Configuration

### Bytez API (Image-Based AI)
- **Provider**: Bytez (bytez.com)
- **Model**: Google Gemini 2.5 Pro
- **Used for**: Topic extraction from images, complex timetable generation

### Open Router API (Text-Based AI)
- **Provider**: Open Router (openrouter.ai)
- **Model**: Mistral 7B Instruct
- **Used for**: Schedule adjustments, test score analysis, learning insights

## Running the Project
The workflow "Start application" runs `npm run dev` which starts:
- Express backend on port 3000 (development)
- Vite frontend on port 5000

## Project Structure
```
/server - Express backend (index.ts, db.ts)
/src - React frontend
  /context - AuthContext for authentication
  /components - UI components
  /pages - Route pages
/shared - Shared types and schemas (schema.ts)
/supabase/functions - Legacy edge functions (deprecated, migrated to Express)
```

## User Preferences
- Security-first: All API keys stored on server, never passed through frontend
- Dual AI approach: Gemini 2.5 Pro for complex tasks, Mistral 7B for faster analysis
- Email verification required for new signups

## Technical Notes
- Frontend development server proxies API calls to backend
- JWT tokens stored in localStorage for authentication
- Email verification codes expire after 10 minutes with max 5 attempts
- All API endpoints use proper error handling and validation
