# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint (ESLint 9 flat config)
```

No test framework is configured in this project.

## Architecture Overview

**ImagePump** is a Next.js 16 (App Router) application for batch AI image editing and compression. Users upload images, select an AI provider, apply prompts, and download processed results as ZIP files.

### Two Modes
- **AI Image Edit**: Sends images to an AI provider with a prompt for transformation
- **Compress Only**: Client-side Canvas API compression without AI calls

### Tech Stack
- **Next.js 16** with App Router and server actions (50MB body limit)
- **React 19**, **TypeScript 5**, **Tailwind CSS 4**
- **Zustand** for state management (store at `src/store/useAppStore.ts`)
- **Sharp** for server-side image compression
- **JSZip** for ZIP generation
- **React Window** for virtualized gallery rendering

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json)

### Key Data Flow
1. Upload → `useImageUpload` hook → Zustand store (`images[]`)
2. Process → `useImageProcessing` hook → `POST /api/generate` per image → results stored as Blobs
3. Compress → `useCompression` hook → Canvas API (client) or `POST /api/compress` (server/Sharp)
4. Download → `useDownload` hook → `POST /api/download` → ZIP via JSZip (batched at ~3MB to respect Vercel limits)

### API Routes (`src/app/api/`)
- **`/api/generate`** — AI image generation (rate limited: 20 req/min/IP, max 60s)
- **`/api/compress`** — Sharp-based compression (max 30s)
- **`/api/download`** — ZIP generation from Base64 images (max 60s, 1024MB memory)

### AI Providers (`src/lib/api-client.ts`)
All providers implement a unified `AIProvider` interface with `generateImage()`. Supported: OpenAI (DALL-E), Google (Gemini), Stability (SD3), Leonardo, ClipDrop, Local SD (Automatic1111), Together AI (FLUX), and Puter (free, client-side SDK). Provider metadata/colors are in `src/lib/providers/index.ts`.

### State Management
Zustand store persists only `compression`, `selectedProvider`, and `mode` to localStorage (`image-pump-storage`). API keys are kept in memory only (never persisted) for security. Images are stored as in-memory Blob references.

### Prompt System
Users set a default prompt and can create prompt groups to assign different prompts to different image subsets. Group assignments and prompts live in the Zustand store.

## Deployment
Configured for Vercel with function-specific timeouts and memory limits in `vercel.json`.
