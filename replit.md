# Workspace

## Overview

Full-stack AI-powered Diet Assistant application built with React + Vite frontend and Express API backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19, Vite, Tailwind CSS 4, shadcn/ui components
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **AI**: OpenAI gpt-5.2 via Replit AI Integrations (no API key required)
- **Auth**: JWT (jsonwebtoken + bcryptjs)

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

1. **User Auth** - Register/login with email + password (JWT-based)
2. **User Profile** - Age, gender, height, weight, activity level, diet preference, goal
3. **AI Diet Plan Generator** - GPT-powered 7-day meal plans with nutritional breakdown
4. **Food Calorie Checker** - AI nutrition lookup with health score + alternatives
5. **Daily Tracker** - Log meals, water intake, and weight
6. **AI Chat** - Diet/nutrition assistant with SSE streaming
7. **Dashboard** - Calorie ring chart, macros breakdown, water tracker, weight trend chart

## API Routes

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET/POST /api/profile` - User profile CRUD
- `POST /api/diet/generate-plan` - Generate 7-day AI diet plan
- `GET /api/diet/plans` - List saved plans
- `POST /api/diet/check-food` - AI food nutrition checker
- `GET /api/tracker/today` - Today's log
- `POST /api/tracker/log-meal` - Log a meal
- `POST /api/tracker/log-water` - Log water intake
- `GET/POST /api/tracker/weight` - Weight tracking
- `GET/POST /api/openai/conversations` - Chat conversations
- `POST /api/openai/conversations/:id/messages` - SSE streaming AI chat

## Database Schema

- `users` - Auth users (email, passwordHash, name)
- `profiles` - User health profiles (age, gender, height, weight, goal, etc.)
- `diet_plans` - Saved AI-generated meal plans
- `meal_entries` - Daily meal log
- `water_entries` - Water intake log
- `weight_entries` - Weight tracking history
- `conversations` - AI chat conversations
- `messages` - Chat messages

## Running

- `pnpm --filter @workspace/api-server run dev` - Run the API server
- `pnpm --filter @workspace/diet-assistant run dev` - Run the frontend
- `pnpm --filter @workspace/api-spec run codegen` - Regenerate API types
- `pnpm --filter @workspace/db run push` - Push DB schema changes
