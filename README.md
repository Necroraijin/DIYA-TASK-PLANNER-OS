<div align="center">
  <img width="1200" height="400" alt="DIYA Workspace Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" style="border-radius: 12px; object-fit: cover;" />
  
  # 🌱 DIYA Task Planner OS
  
  **A beautiful, calming productivity OS that blends mindfulness with advanced agentic planning and interactive databases.**
  
  [![GCP Cloud Run Deploy](https://img.shields.io/badge/GCP-Cloud_Run_Deployed-blue?logo=google-cloud&logoColor=white)](https://diya-task-planner-1076561857350.asia-south1.run.app)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Checked-blue?logo=typescript&logoColor=white)](#)
  [![Framework](https://img.shields.io/badge/Next.js-15.x-black?logo=next.js&logoColor=white)](#)
</div>

---

## 📖 Introduction

**DIYA Task Planner OS** is a custom, fully-integrated student workspace and developer dashboard designed to minimize cognitive load. Unlike traditional, stress-inducing task planners, DIYA focuses on organic design, calming transitions, and structural efficiency. It features an intelligent **AI Planner** with model fallbacks, a **Relational SQL Playground** with schema visualization, and a real-time **Firebase Cloud Sync** system that degrades gracefully to local storage offline.

---

## 🌟 Core Features

- **🧘 Mindfulness Dashboard:** Interactive daily schedule, habit tracking streaks, custom focus timers, and calming organic quotes from thinkers like Lao Tzu and Ralph Waldo Emerson.
- **🤖 Dual-Mode AI Assistant:** Integrated with `@google/genai` to support:
  - **Google AI Studio Mode** (for developers using local API keys).
  - **GCP Vertex AI Mode** (using secure Application Default Credentials on Cloud Run).
- **🛡️ Model Fallback Strategy:** Automatically checks and cascades down available Gemini models (Gemini 3.5 Flash $\rightarrow$ 2.5 Flash $\rightarrow$ 1.5 Flash $\rightarrow$ Pro preview models) to protect against rate limits (503 Service Unavailable).
- **🗄️ Relational SQL Playground:** A fully-normalized client-side relational database stored in encrypted local storage. Run SQL commands (e.g. `SELECT`, `JOIN`, `DELETE`) with full primary/foreign key cascading and view the live database schema.
- **🔄 Firestore Cloud Sync:** Seamlessly backs up tasks and data to Firestore when authentication is active, falling back to local fallback encryption when offline.

---

## 📁 Project Architecture

```
├── app/
│   ├── api/                   # API Endpoints (Gemini requests, proactive planning)
│   ├── globals.css            # Base Tailwind and custom styles
│   ├── layout.tsx             # HTML structure & metadata
│   │   └── page.tsx           # Main workspace UI component (Dashboard, SQL, AI)
├── lib/
│   ├── gemini.ts              # Google Gen AI initialization and fallback strategy
│   ├── firebase.ts            # Firestore and authentication wrapper
│   ├── relationalDB.ts        # Client-side relational database and SQL engine
│   ├── encryption.ts          # AES text encryption utilities
│   └── types.ts               # Core database schema interfaces
├── Dockerfile                 # Multi-stage production container configuration
└── tsconfig.json              # TypeScript compilation rules
```

---

## 🚀 Local Development

### Prerequisites
- [Node.js 20+](https://nodejs.org)
- Google Cloud SDK (if running GCP Vertex AI features)

### 1. Installation
Clone the project and install all dependencies:
```bash
npm install
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
# Developer Studio configuration (Optional if using Vertex AI)
GEMINI_API_KEY=your-gemini-api-key

# Vertex AI Configuration
USE_VERTEX=false  # Set to true to force GCP Vertex AI mode
GCP_PROJECT=diya-task-planner-os
GCP_LOCATION=asia-south1
```

### 3. Run the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to view the application.

---

## 🐳 Docker & GCP Cloud Run Deployment

This project contains a multi-stage production [Dockerfile](file:///d:/PROJECTS/New folder (2)/DIYA-TASK-PLANNER-OS/Dockerfile) tailored for Cloud Run environments.

### Deploying via Google Cloud Build
Run the following command to build the image and deploy to Cloud Run automatically:
```bash
gcloud run deploy diya-task-planner \
  --source . \
  --allow-unauthenticated \
  --region asia-south1
```

> [!NOTE]
> **Authentication in GCP:** When deployed to Cloud Run, the app automatically inherits the IAM role **Vertex AI User** (`roles/aiplatform.user`) from the default Compute service account. No Vertex AI API keys are required.

---

## 🛠️ Recent Troubleshooting & Fixes

### ❌ Issue: GoogleGenAIOptions 'vertex' configuration error
When attempting to deploy or build, the compiler threw:
`Object literal may only specify known properties, but 'vertex' does not exist in type 'GoogleGenAIOptions'. Did you mean to write 'vertexai'?`

* **Root Cause:** The modern `@google/genai` SDK requires the key `vertexai: true` instead of `vertex: true` to switch to Vertex AI mode.
* **Resolution:** Corrected in [gemini.ts](file:///d:/PROJECTS/New folder (2)/DIYA-TASK-PLANNER-OS/lib/gemini.ts#L13):
  ```typescript
  geminiClient = new GoogleGenAI({
    vertexai: true,
    project: process.env.GCP_PROJECT || 'diya-task-planner-os',
    location: process.env.GCP_LOCATION || 'asia-south1'
  });
  ```
