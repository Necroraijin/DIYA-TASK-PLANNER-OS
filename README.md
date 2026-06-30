# 🌱 DIYA Task Planner OS

**A calming, agentic productivity workspace for students — built on Next.js and Google Cloud, with a Gemini-powered AI co-pilot that plans, prioritizes, and writes on the student's behalf.**

[![Live on Cloud Run](https://img.shields.io/badge/GCP-Cloud_Run_Deployed-4285F4?logo=googlecloud&logoColor=white)](https://diya-task-planner-1076561857350.asia-south1.run.app)
[![Vertex AI](https://img.shields.io/badge/AI-Vertex_AI_%2F_Gemini-9334E6?logo=googlegemini&logoColor=white)](#how-google-cloud-is-used)
[![Firebase](https://img.shields.io/badge/Backend-Firebase_%2F_Firestore-F9AB00?logo=firebase&logoColor=white)](#how-google-cloud-is-used)
[![Next.js](https://img.shields.io/badge/Framework-Next.js_15-black?logo=nextdotjs&logoColor=white)](#tech-stack)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)](#tech-stack)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Features](#core-features)
3. [System Architecture](#system-architecture)
4. [How Google Cloud Is Used](#how-google-cloud-is-used)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Request Lifecycle: How a Task Gets Its AI Audit](#request-lifecycle-how-a-task-gets-its-ai-audit)
8. [Getting Started](#getting-started)
9. [Deployment to Cloud Run](#deployment-to-cloud-run)
10. [Environment Variables](#environment-variables)
11. [Security Model](#security-model)
12. [Known Limitations & Roadmap](#known-limitations--roadmap)
13. [License](#license)

---

## Introduction

**DIYA Task Planner OS** is a student workspace that treats productivity as a *mindfulness problem*, not just a scheduling problem. Most task planners pile up red deadlines and stress notifications; DIYA instead pairs a calm, organic interface with an agentic AI layer that proactively reduces the cognitive load of starting work — auditing tasks for *why* they feel hard, generating ready-to-go first steps, and drafting the emails a student would otherwise procrastinate on.

It is built as a single, fully-integrated Next.js application and deployed as a containerized service on **Google Cloud Run**, with **Vertex AI** powering its generative features and **Firebase** providing authentication and real-time data sync.

---

## Core Features

- **🧘 Mindfulness Dashboard** — an interactive daily schedule, habit-tracking streaks, focus timers, and rotating calming quotes, designed to lower stress rather than add to it.
- **🤖 AI Cognitive Priority Copilot** — every task can be audited by Gemini, which explains *why* a task is causing friction, what actually happens if it slips, and gives three ready-to-go starter actions plus two backup plans.
- **💬 AI Study Planner Chat** — a conversational planning assistant that turns pasted notes, syllabi, or free-form goals into structured, bulleted study guides and automatically proposes calendar milestones with real dates.
- **📨 Proactive Email Copilot** — drafts polished, context-aware replies to incoming academic emails (e.g., extension requests, group project check-ins) along with a short pre-send checklist.
- **🗄️ Relational SQL Playground** — a client-side, fully-normalized relational schema (users, tasks, habits, habit logs, tags, task-tag junctions) with cascading deletes, a live schema visualizer, and a query box that supports template `SELECT` / `JOIN` / `GROUP BY` patterns.
- **🔄 Firestore Cloud Sync** — when a user is authenticated, tasks, habits, and notifications sync to Cloud Firestore in real time; when offline or unauthenticated, the app degrades gracefully to an encrypted local store with zero functional loss.
- **🛡️ Model Fallback Strategy** — every Gemini call cascades through a prioritized list of models (`gemini-3.5-flash` → `2.5-flash` → `1.5-flash` → … → Pro) and, if every model fails, falls back to a hand-authored "sandbox" response so the UI never shows a dead end.
- **⏰ Deadline Reminders** — a server route scans upcoming deadlines and dispatches reminder emails via SMTP (Nodemailer) for tasks due within 48 hours.

---

## System Architecture

![DIYA Task Planner OS system architecture diagram showing the browser client, the Next.js app on Google Cloud Run, Vertex AI, Firebase, and external SMTP, with arrows showing how requests flow between them](./architecture-diagram.png)

**How to read this diagram:**

- The **browser client** (blue, left) renders the entire workspace as one Next.js/React shell and keeps an offline-first relational data cache in `localStorage`.
- The **Cloud Run container** (blue, center) is a custom Node server wrapping the Next.js App Router. It exposes four API routes that all funnel through a shared model-fallback library before reaching Vertex AI.
- **Vertex AI** (purple, bottom right) serves all generative requests using Application Default Credentials — no API key ever ships to the client or sits in a config file.
- **Firebase** (amber, top) is reached directly from the browser via the Firebase JS SDK for authentication and real-time Firestore sync, governed by `firestore.rules`.
- **SMTP** (gray) is invoked server-side only, for deadline reminder dispatch.

---

## How Google Cloud Is Used

DIYA is built **Google-Cloud-native end to end** — compute, AI inference, and the deployment pipeline all run on GCP.

### 1. Google Cloud Run (Compute)

The entire application is packaged into a container and deployed as a Cloud Run service in `asia-south1`:

```bash
gcloud run deploy diya-task-planner \
  --source . \
  --allow-unauthenticated \
  --region asia-south1
```

Cloud Run was chosen over a traditional VM or App Engine because the workload is a lightweight Node server with bursty, request-driven traffic (Gemini calls, Firestore reads) — Cloud Run's scale-to-zero billing and fully managed HTTPS endpoint fit that pattern with no infrastructure to babysit. The container runs `server.ts` (compiled to `server.js`), a thin custom HTTP server wrapping the Next.js request handler so the app can listen on Cloud Run's injected `PORT`.

### 2. Vertex AI (Generative AI Platform)

All AI features — the cognitive priority audit, the study-planner chat, and the proactive email/guide generator — call **Vertex AI's Gemini models** through the `@google/genai` SDK. `lib/gemini.ts` switches between two credential modes:

| Mode | When it's used | Credentials |
|---|---|---|
| **Vertex AI mode** | Production (Cloud Run) | Application Default Credentials — no key required |
| **AI Studio mode** | Local development | `GEMINI_API_KEY` in `.env.local` |

```ts
geminiClient = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT || 'diya-task-planner-os',
  location: process.env.GCP_LOCATION || 'asia-south1'
});
```

On every request, `generateWithFallback()` walks down a prioritized list of Gemini models so a single model being rate-limited or returning a `503` never takes down a feature — it just quietly retries on the next model in the cascade.

### 3. IAM & Application Default Credentials

Because the app runs on Cloud Run, it automatically inherits the **`roles/aiplatform.user`** IAM role from the default Compute Engine service account. This means:

- No Vertex AI API key is generated, stored, or shipped anywhere.
- Credentials are short-lived and scoped to the service account, not a developer's personal key.
- The same code path works identically in local development (via `gcloud auth application-default login`) and in production.

### 4. Google Cloud Build (CI/CD)

`gcloud run deploy --source .` hands the source directory to **Cloud Build**, which executes the multi-stage `Dockerfile`:

![GCP build and deployment pipeline diagram showing source code flowing through Cloud Build stages, into Artifact Registry, and out to a Cloud Run revision, with IAM granting Vertex AI access](./deployment-pipeline-diagram.png)

1. **Stage 1** — `npm ci` installs locked dependencies inside a `node:20-alpine` base image.
2. **Stage 2** — `next build` compiles the production Next.js bundle, and `tsc` compiles `server.ts` to plain CommonJS `server.js`.
3. The resulting image is pushed to **Artifact Registry**.
4. Cloud Run pulls the image and rolls out a new revision, serving traffic on the assigned HTTPS endpoint with `--allow-unauthenticated`.

### 5. Firebase (built on Google Cloud)

Firebase Authentication handles email/password sign-up with mandatory email verification, and **Cloud Firestore** stores `users`, `tasks`, `habits`, and `notifications` collections with real-time `onSnapshot()` sync to the client. `firestore.rules` enforces a **default-deny** posture: every collection requires a signed-in request whose `auth.uid` matches the document's `userId`, plus per-field shape validation on writes.

### Why `asia-south1`?

The app targets students in India, so both Cloud Run and the Vertex AI client are pinned to `asia-south1` (Mumbai) to minimize round-trip latency for the primary user base.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | `motion` (Framer Motion successor) |
| AI SDK | `@google/genai` — Vertex AI + AI Studio dual-mode |
| Auth & DB | Firebase Authentication + Cloud Firestore |
| Email | Nodemailer (SMTP) |
| Local persistence | Custom relational engine over `localStorage` |
| Compute | Google Cloud Run |
| AI inference | Google Vertex AI (Gemini model family) |
| CI/CD | Google Cloud Build |
| Container | Docker (multi-stage, `node:20-alpine`) |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── gemini/route.ts              # Cognitive priority audit
│   │   ├── gemini/planning/route.ts     # AI study planner chat
│   │   ├── gemini/proactive/route.ts    # Proactive guides + email drafts
│   │   └── notifications/remind/route.ts# Deadline reminder dispatch (SMTP)
│   ├── globals.css                      # Tailwind + custom organic theme
│   ├── layout.tsx                       # HTML shell & metadata
│   └── page.tsx                         # Main workspace UI (all tabs)
├── lib/
│   ├── gemini.ts                        # Vertex AI / AI Studio client + model fallback
│   ├── firebase.ts                      # Firebase app, auth, Firestore init
│   ├── relationalDB.ts                  # Client-side relational schema + SQL playground
│   ├── encryption.ts                    # Local data obfuscation helper
│   ├── types.ts                         # Shared TypeScript interfaces
│   └── utils.ts                         # Small UI helpers
├── firestore.rules                      # Per-user, default-deny security rules
├── firebase-applet-config.json          # Firebase Web SDK config (public client config)
├── Dockerfile                           # Multi-stage production build
├── server.ts                            # Custom Node server for Cloud Run
└── package.json
```

---

## Request Lifecycle: How a Task Gets Its AI Audit

1. The student adds a task and clicks **"Audit with AI Copilot."**
2. The browser sends a `POST` to `/api/gemini` with the task's title, category, priority, deadline, and description.
3. The Cloud Run container's API route calls `lib/gemini.ts`, which is already authenticated to Vertex AI via Application Default Credentials.
4. `generateWithFallback()` tries `gemini-3.5-flash` first; if it 503s, it transparently retries the next model in the cascade.
5. Gemini returns a structured JSON object (enforced via `responseSchema`) containing the cognitive-load explanation, consequence framing, three ready-to-go solutions, two backup plans, and an encouraging note.
6. The result is merged into the task and, if the user is signed in, written to Firestore through the Firebase client SDK — subject to `firestore.rules` ownership checks.
7. If every model fails (e.g., quota exhaustion), the route returns a hand-authored, topic-aware fallback response instead of an error, so the feature degrades gracefully rather than breaking.

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- Google Cloud SDK (only needed for Vertex AI mode or deployment)

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file:

```bash
# Developer/AI Studio mode (optional if using Vertex AI)
GEMINI_API_KEY=your-gemini-api-key

# Vertex AI mode
USE_VERTEX=false          # set true to force Vertex AI locally
GCP_PROJECT=diya-task-planner-os
GCP_LOCATION=asia-south1
```

### Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Deployment to Cloud Run

```bash
gcloud run deploy diya-task-planner \
  --source . \
  --allow-unauthenticated \
  --region asia-south1
```

No manual Vertex AI credential setup is required — the deployed revision inherits the `roles/aiplatform.user` IAM role from the default Compute Engine service account.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Only for AI Studio mode | Authenticates Gemini calls outside Vertex AI |
| `USE_VERTEX` | No (defaults to Vertex if no key is set) | Forces Vertex AI mode |
| `GCP_PROJECT` | Vertex AI mode | GCP project ID for Vertex AI calls |
| `GCP_LOCATION` | Vertex AI mode | Region for Vertex AI calls (`asia-south1`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | Optional | Enables real email dispatch for deadline reminders |

---

## Security Model

- **Default-deny Firestore rules** — every collection requires `request.auth.uid` to match the document's `userId`, with per-field shape validation on every write.
- **No AI credentials on the client** — Vertex AI is only ever called server-side, authenticated via the Cloud Run service account.
- **Graceful degradation** — every AI route has a hand-written fallback path so a Vertex AI outage never surfaces as a broken feature.
- **Offline-first local cache** — when signed out or offline, the app keeps working against a local relational store and syncs once the user authenticates.

---

## Known Limitations & Roadmap

In the interest of transparency for review, a few areas are intentionally simplified for this build and are the next planned improvements:

- **Local encryption** (`lib/encryption.ts`) currently uses a lightweight XOR-based obfuscation for the local cache rather than a standards-based cipher (e.g., AES-GCM via the Web Crypto API) — adequate for casual local storage, not intended as cryptographic-grade protection. Upgrading to Web Crypto AES-GCM is the next step.
- **The SQL Playground** matches a curated set of query templates (`SELECT`, `JOIN`, `GROUP BY`, `WHERE`) rather than running a full SQL grammar — a genuine embedded engine (e.g., `sql.js`) is on the roadmap for arbitrary queries.
- **Offline auth fallback** currently stores credentials in `localStorage` for demo/offline mode; this path is intended for local prototyping only and should move to a hashed-credential approach before any non-Firebase-authenticated deployment.
- **SMTP configuration** can optionally be supplied per-request; production deployments should lock this to server-side environment variables only.
- **Planned next:** push notifications, calendar (Google Calendar) two-way sync, and a richer multi-user collaboration model for shared study groups.

---

## License

This project was built for hackathon submission. See repository for license details.

---

*Built with Next.js, Vertex AI, and Firebase — deployed on Google Cloud Run (`asia-south1`).*
