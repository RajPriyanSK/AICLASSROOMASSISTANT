# AI Classroom Assistant

## Overview

A production-ready AI-powered classroom management web application with role-based access for Teachers and Students.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS v4 (artifacts/classroom)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (Replit's built-in DB)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Authentication**: Firebase Authentication
- **File Storage**: Supabase Storage (lecture audio)
- **Speech-to-Text**: RapidAPI Speech Recognition
- **AI Summarization & Task Extraction**: Google Gemini API
- **AI Chatbot**: Groq API (llama-3.3-70b-versatile)

## Structure

```text
artifacts/
├── api-server/             # Express 5 API backend
│   └── src/
│       ├── lib/            # External service clients
│       │   ├── supabase.ts # Supabase Storage (lazy init)
│       │   ├── gemini.ts   # Google Gemini summarization + task extraction
│       │   ├── groq.ts     # Groq chatbot
│       │   └── speechToText.ts # RapidAPI transcription
│       └── routes/
│           ├── users.ts    # User sync + profile
│           ├── lectures.ts # Lecture CRUD + upload URL + process
│           ├── tasks.ts    # Task approval/rejection/completion
│           └── chat.ts     # AI chatbot
└── classroom/              # React frontend
    └── src/
        ├── lib/firebase.ts # Firebase auth init
        ├── context/AuthContext.tsx
        ├── pages/
        │   ├── Login.tsx
        │   ├── Signup.tsx
        │   ├── dashboard/TeacherDashboard.tsx
        │   ├── dashboard/StudentDashboard.tsx
        │   └── lectures/LectureDetail.tsx
        └── components/
            ├── StatusBadge.tsx
            ├── CreateLectureModal.tsx
            └── layout/Navbar.tsx

lib/
├── api-spec/openapi.yaml   # OpenAPI contract
├── api-client-react/       # Generated React Query hooks
├── api-zod/                # Generated Zod schemas
└── db/src/schema/
    ├── users.ts
    ├── lectures.ts
    └── tasks.ts
```

## Database Schema

- **users** — Firebase UID, email, display name, role (teacher/student)
- **lectures** — title, description, audio URL, transcript, summary, status, teacher UID
- **tasks** — lecture ID, title, description, deadline, status (pending/approved/rejected/completed)

## Features

1. **Firebase Auth** — Email/password + Google sign-in, role selection at signup
2. **Role-based routing** — Teacher and Student dashboards
3. **Lecture management** — Create, record/upload audio, process with AI
4. **Speech-to-Text** — RapidAPI converts audio to transcript
5. **AI Processing** — Gemini generates summaries and extracts tasks
6. **Teacher Approval** — Teachers approve/reject extracted tasks
7. **Student Dashboard** — View summaries, transcripts, tasks with deadlines
8. **AI Chatbot** — Groq-powered Q&A from lecture transcript context

## Environment Variables Required

Secrets (set in Replit Secrets):
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `RAPIDAPI_KEY` — RapidAPI Speech Recognition
- `GEMINI_API_KEY` — Google Gemini
- `GROQ_API_KEY` — Groq
- `DATABASE_URL` — Auto-provisioned by Replit

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/users/sync | Sync Firebase user to DB |
| GET | /api/users/me | Get current user profile |
| GET | /api/lectures | List all lectures |
| POST | /api/lectures | Create lecture |
| GET | /api/lectures/:id | Get lecture detail with tasks |
| DELETE | /api/lectures/:id | Delete lecture |
| POST | /api/lectures/:id/upload-url | Get signed upload URL |
| POST | /api/lectures/:id/process | Transcribe + summarize + extract tasks |
| GET | /api/tasks | List tasks |
| PATCH | /api/tasks/:id/approve | Teacher approves task |
| PATCH | /api/tasks/:id/reject | Teacher rejects task |
| PATCH | /api/tasks/:id/complete | Student marks task complete |
| POST | /api/chat | AI chatbot for lecture Q&A |
