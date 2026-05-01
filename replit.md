# Workspace

## Overview

Full-stack AI-powered Diet Assistant (NutriAI) built with React + Vite frontend and Express API backend. Features Clerk auth (Google OAuth + email), disease-specific diet plans, BMI/BMR calculator, voice coach, fasting tracker, gamification, and i18n.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19, Vite, Tailwind CSS 4, shadcn/ui components, Framer Motion
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **AI**: OpenAI gpt-5.2 via Replit AI Integrations (no API key required)
- **Auth**: Clerk (`@clerk/react`, `@clerk/express`) — Google OAuth + email/password
- **i18n**: `i18next` + `react-i18next` (English, Hindi, Spanish)
- **Barcode scanning**: `@zxing/browser`

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── diet-assistant/     # React + Vite frontend (served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side client
│   └── integrations-openai-ai-react/   # OpenAI React hooks
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

1. **Clerk Auth** - Google OAuth + email/password sign-in; `requireAuth` middleware uses Clerk session cookies + legacy JWT fallback
2. **User Profile** - Age, gender, height, weight, activity level, diet preference, goal, health conditions
3. **AI Diet Plan Generator** - GPT-powered 7-day meal plans with nutritional breakdown
4. **Food Calorie Checker** - AI nutrition lookup with health score + alternatives + barcode scanner
5. **Daily Tracker** - Log meals, water intake, and weight
6. **AI Chat** - Diet/nutrition assistant with SSE streaming
7. **Dashboard** - Calorie ring chart, macros breakdown, water tracker, weight trend chart
8. **BMI & BMR Calculator** - Body metrics with activity-adjusted TDEE
9. **Disease-Specific Diet Plans** - AI plans for diabetes, hypertension, PCOS, kidney disease, etc.
10. **Voice Coach** - Web Speech API recording + SSE streaming AI coaching
11. **Fasting Tracker** - 16:8 / 18:6 / OMAD timers with history
12. **Gamification & Achievements** - Streaks, points, badges
13. **i18n** - Language switcher in sidebar (EN/हि/ES)

## API Routes

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login (legacy JWT)
- `GET /api/auth/me` - Get current user
- `GET/POST /api/profile` - User profile CRUD
- `POST /api/diet/generate-plan` - Generate 7-day AI diet plan
- `GET /api/diet/plans` - List saved plans
- `POST /api/diet/check-food` - AI food nutrition checker
- `POST /api/diet/disease-plan` - AI disease-specific diet plan
- `GET /api/tracker/today` - Today's log
- `POST /api/tracker/log-meal` - Log a meal
- `POST /api/tracker/log-water` - Log water intake
- `GET/POST /api/tracker/weight` - Weight tracking
- `GET/POST /api/openai/conversations` - Chat conversations
- `POST /api/openai/conversations/:id/messages` - SSE streaming AI chat
- `GET/POST /api/fasting/*` - Fasting session management
- `GET/POST /api/gamification/*` - Achievements and points
- `POST /api/coach/message` - Voice coach AI response
- `GET /api/coach/health-risks` - Health risk assessment

## Database Schema

- `users` - Auth users (email, passwordHash, name, clerk_id)
- `profiles` - User health profiles (age, gender, height, weight, goal, health_conditions, etc.)
- `diet_plans` - Saved AI-generated meal plans
- `meal_entries` - Daily meal log
- `water_entries` - Water intake log
- `weight_entries` - Weight tracking history
- `conversations` - AI chat conversations
- `messages` - Chat messages
- `gamification` - Points, streaks, badges
- `fasting_sessions` - Fasting timer records

## Auth Notes

- Clerk handles auth in the browser via session cookies (automatically sent on same-origin requests)
- `requireAuth` in `api-server/src/lib/auth.ts` calls `getAuth(req)` first (Clerk), then falls back to JWT Bearer token for legacy users
- Clerk user → internal integer userId mapped via `usersTable.clerk_id` column
- Frontend: `api-direct.ts` sets `credentials: "include"` on all fetch requests

## Running

- `pnpm --filter @workspace/api-server run dev` - Run the API server
- `pnpm --filter @workspace/diet-assistant run dev` - Run the frontend
- `pnpm --filter @workspace/api-spec run codegen` - Regenerate API types
- `pnpm --filter @workspace/db run push` - Push DB schema changes
