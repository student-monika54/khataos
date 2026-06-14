# KhataOS

> AI-Powered Microbank for Bharat's 13M+ Kirana Stores

KhataOS turns every kirana store into an AI-powered microbank. It combines on-device AI, multilingual voice ordering, and a multi-agent financial brain to automate credit, trust scoring, repayments, and collections.

[![Deployed on Lovable](https://lovable.dev/badge)](https://khataos.lovable.app)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Voice AI Pipeline](#voice-ai-pipeline)
- [Financial Brain](#financial-brain)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

KhataOS is built for the Indian kirana ecosystem. A customer can speak their order in Hindi, Kannada, Tamil, Telugu, or English — and the system extracts items, prices, and quantities via AI. The shopkeeper gets an instant credit recommendation, a trust score for the customer, and actionable business insights.

The app supports two primary personas:

| Persona | Experience |
|--------|------------|
| **Customer** | Voice ordering, credit requests, repayments, order tracking, trust score visibility |
| **Shopkeeper / Retailer** | Live call monitoring, AI business insights, order management, collections, inventory-linked credit, ledger, procurement |

---

## Key Features

### Voice Commerce
- **Quick Voice** — In-browser speech recognition → Gemini Flash order extraction → instant database insert
- **Call Agent** — Twilio inbound calls → Sarvam AI STT (translate + detect language) → Gemini Flash extractor → Sarvam TTS response loop
- **Multilingual** — Supports English, Hindi, Kannada, Tamil, Telugu

### AI Financial Brain
- **Credit Agent** — Approve / reject / conditional credit in real time
- **Collections Agent** — Settlement plan negotiation and follow-ups
- **Trust Agent** — Customer trust score breakdown and monitoring
- **Working Capital Agent** — Inventory-linked credit recommendations
- **Insights Agent** — Business intelligence and anomaly detection

### Shopkeeper Command Center
- Live voice order monitoring with real-time transcripts
- Agent activity feed and decision pipeline visualization
- Inventory expiry alerts with voice campaign triggers
- Customer trust network and leaderboards
- Collection rate tracking and repayment forecasting

### Customer App
- Voice-first order placement
- Credit limit and outstanding balance visibility
- Repayment tracking
- Trust score gamification

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CUSTOMER FACING                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Quick Voice  │  │  Call Agent  │  │   Web App    │  │   Trust Score    │  │
│  │  (Browser)     │  │  (Twilio)    │  │  (React PWA) │  │    Dashboard     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │                 │                   │                                │
│         └─────────────────┴───────────────────┘                                │
│                              │                                                │
│                              ▼                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    KHATAOS CORE (TanStack Start)                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐ │  │
│  │  │   Sarvam    │  │   Gemini    │  │  Financial  │  │    Orders     │ │  │
│  │  │    STT      │  │   Flash     │  │    Brain    │  │    Engine     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                │
│                              ▼                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         LOVABLE CLOUD (Supabase)                          │  │
│  │         Auth · Database · Storage · Edge Functions · Realtime          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                             RETAILER FACING                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Command    │  │   Live Call  │  │   Ledger &   │  │   Collections    │  │
│  │   Center     │  │   Monitor    │  │   Orders     │  │   Dashboard      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | TanStack Start v1 (React 19, SSR, file-based routing) |
| **Build Tool** | Vite 7 |
| **Styling** | Tailwind CSS v4 |
| **UI Components** | Radix UI primitives + shadcn/ui |
| **State** | TanStack Query v5, Zustand (via `useKhata`) |
| **Backend** | TanStack Server Functions (`createServerFn`) |
| **Database** | Supabase (PostgreSQL + Row Level Security) |
| **Auth** | Supabase Auth (phone OTP, anonymous) |
| **AI Gateway** | Lovable AI Gateway (Gemini 3 Flash, OpenRouter-compatible) |
| **Voice STT** | Sarvam AI `saaras-v3` (streaming + REST, translate mode) |
| **Voice TTS** | Sarvam AI text-to-speech |
| **Telephony** | Twilio (voice webhooks, recordings, inbound calls) |
| **Charts** | Recharts |
| **Animation** | Framer Motion |
| **Validation** | Zod |

---

## Voice AI Pipeline

### Quick Voice (In-App)

```text
Browser SpeechRecognition
        │
        ▼
Transcript (Hindi / Kannada / English)
        │
        ▼
POST /api/khataos/orders  ──►  Gemini Flash extracts items
        │
        ▼
Order row inserted → Customer & Retailer dashboards update
        │
        ▼
Browser TTS confirms: "Order saved: 2 kg rice, 1 L oil"
```

### Call Agent (Phone)

```text
Inbound Call → Twilio Voice Webhook
                    │
                    ▼
    "Welcome to KhataOS. Please tell me what you'd like to order after the beep."
                    │
                    ▼
            <Record> → POST /api/public/twilio/record
                    │
                    ▼
        Sarvam STT (translate to English + detect language)
                    │
                    ▼
        ┌─────────────────────────────────────┐
        │  End phrase detected?               │
        │  ("done", "bas", "saaku", "thank you") │
        └──────────┬──────────────────────┬─────┘
                   │ YES                  │ NO
                   ▼                      ▼
        ┌──────────────────┐   ┌──────────────────────┐
        │ Cart has items?  │   │ Gemini Flash extracts  │
        │                  │   │ items from transcript  │
        └────┬──────┬──────┘   └──────────┬─────────────┘
             │ YES  │ NO                  │
             ▼      ▼                     ▼
    Financial Brain        "Okay, goodbye."      Append to cart
    Trust Score +                                   │
    Credit Decision                                 ▼
             │                         TTS: "Added 2 kg rice.
             ▼                               Anything else?"
    Insert order row                              │
    status: pending_credit_review                 ▼
             │                               <Record> loop
             ▼
    "Order confirmed. Thank you. Goodbye."
             │
             ▼
         <Hangup/>
```

**End-of-order phrase detection (multilingual):**

| Language | Phrases |
|----------|---------|
| English | "that's all", "done", "finished", "no more", "thank you", "enough" |
| Hindi | "bas", "kuch nahi", "aur kuch nahi", "ho gaya" |
| Kannada | "saaku", "saakaagide", "mugiyitu" |
| Tamil/Telugu | "podhum", "chaalu", "podi" |

---

## Financial Brain

The Financial Brain is a multi-agent reasoning system that runs over the Lovable AI Gateway (Gemini 3 Flash). Each intent is routed to a specialized agent:

| Intent | Agent | Output |
|--------|-------|--------|
| `CREDIT_REQUEST` | CreditAgent | approve / reject / conditional + recommended amount |
| `KHATA_ORDER` | CreditAgent | Same as above, applied to order totals |
| `REPAYMENT` | CreditAgent | approve, trust delta +1 |
| `COLLECTIONS_FOLLOWUP` | CollectionsAgent | conditional settlement plan |
| `SETTLEMENT` | CollectionsAgent | conditional, trust delta -1 |

**Deterministic guardrails** (always run before AI):
- `trustScore < 55` → auto-reject
- `outstanding / limit > 0.9` → auto-reject
- `requested <= available && trustScore >= 70` → auto-approve
- Otherwise → conditional with reduced amount

The AI generates a one-sentence human-readable reasoning on top of the deterministic decision.

---

## Project Structure

```text
src/
├── routes/
│   ├── index.tsx                    # Landing page (marketing site)
│   ├── app.tsx                      # App shell with bottom nav
│   ├── app.customer.*.tsx           # Customer screens
│   │   ├── app.customer.voice.tsx     # Quick Voice ordering
│   │   ├── app.customer.call.tsx      # In-app call dialer
│   │   ├── app.customer.orders.tsx    # Order history
│   │   ├── app.customer.credit.tsx    # Credit request
│   │   ├── app.customer.repayments.tsx # Repayments
│   │   └── app.customer.trust.tsx     # Trust score
│   ├── app.shopkeeper.*.tsx           # Retailer dashboard screens
│   │   ├── app.shopkeeper.index.tsx   # Home / overview
│   │   ├── app.shopkeeper.insights.tsx # Financial Brain / Command Center
│   │   ├── app.shopkeeper.live.tsx    # Live call monitor
│   │   ├── app.shopkeeper.orders.tsx  # Order management
│   │   ├── app.shopkeeper.ledger.tsx  # Ledger view
│   │   ├── app.shopkeeper.calls.tsx   # Call history
│   │   ├── app.shopkeeper.collections.tsx # Collections
│   │   ├── app.shopkeeper.procurement.tsx # Procurement
│   │   └── app.shopkeeper.settings.tsx    # Settings
│   └── api/
│       ├── khataos.ts               # Main customer voice API
│       ├── khataos.orders.ts        # Order creation + Gemini extraction
│       ├── khataos.orders.live.ts   # Live orders feed
│       ├── khataos.health.ts        # Health check
│       └── api/public/
│           ├── twilio.voice.ts        # Twilio inbound voice webhook
│           ├── twilio.record.ts       # Twilio recording handler (Sarvam → Gemini loop)
│           ├── twilio.menu.ts         # Legacy DTMF menu
│           └── twilio.gather.ts       # DTMF gather handler
├── components/
│   ├── landing/                     # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── AgentNetwork.tsx
│   │   ├── Architecture.tsx
│   │   └── ...
│   └── app/                         # App components
│       ├── AppShell.tsx
│       ├── BottomNav.tsx
│       ├── LiveOrdersPanel.tsx
│       ├── CallPipeline.tsx
│       └── ...
├── lib/
│   ├── khataos/
│   │   ├── order-extractor.server.ts   # Gemini Flash order parser
│   │   ├── financial-brain.server.ts   # Multi-agent credit brain
│   │   ├── sarvam.server.ts            # Sarvam STT / TTS client
│   │   ├── call-store.server.ts        # In-memory call state (per-call cart)
│   │   ├── calls.ts                    # Types & agent routing map
│   │   ├── commerce-brain.ts           # Legacy orchestrator
│   │   ├── commerce-brain-rules.ts     # Intent regex rules
│   │   ├── templates.ts                # TTS response templates
│   │   ├── voice-menu.ts               # IVR menu definitions
│   │   ├── catalog.ts                  # Product catalog + prices
│   │   ├── data.ts                     # Demo data store (Zustand)
│   │   └── live-orders.server.ts       # Live order SSE feed
│   └── ai-gateway.server.ts          # Lovable AI Gateway provider
├── integrations/
│   └── supabase/                     # Supabase client, auth middleware, types
├── styles.css                        # Tailwind v4 theme tokens
├── router.tsx                        # TanStack Router setup
└── start.ts                          # TanStack Start entry
```

---

## Environment Variables

Create a `.env` file at the project root (do not commit secrets):

```bash
# Supabase (auto-configured by Lovable Cloud)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>

# Lovable AI Gateway
LOVABLE_API_KEY=<your-lovable-api-key>

# Sarvam AI (Voice STT + TTS)
SARVAM_API_KEY=<your-sarvam-api-key>

# Twilio (Inbound calls)
TWILIO_ACCOUNT_SID=<twilio-account-sid>
TWILIO_AUTH_TOKEN=<twilio-auth-token>
TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
TWILIO_API_KEY=<optional-lovable-connector-key>
```

> **Note:** `SARVAM_API_KEY` is optional. If absent, the call pipeline falls back to a legacy Twilio `<Gather>` DTMF menu. If `LOVABLE_API_KEY` is absent, order extraction and financial brain reasoning fall back to deterministic heuristics with canned messages.

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) (recommended) or Node.js 20+
- A Lovable account with Cloud enabled (for Supabase + AI Gateway)
- (Optional) Sarvam AI key for voice features
- (Optional) Twilio account for phone call ordering

### Install

```bash
bun install
```

### Development

```bash
bun run dev
```

The dev server starts at `http://localhost:3000`.

### Build

```bash
bun run build
```

### Format / Lint

```bash
bun run format
bun run lint
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/khataos` | Main customer voice endpoint (intent → agent reply) |
| `POST` | `/api/khataos/orders` | Create order from transcript (Gemini extraction) |
| `GET`  | `/api/khataos/orders/live` | SSE stream of live voice orders |
| `POST` | `/api/public/twilio/voice` | Twilio inbound call webhook |
| `POST` | `/api/public/twilio/record` | Twilio recording handler (Sarvam STT → Gemini → Sarvam TTS) |
| `POST` | `/api/public/twilio/menu` | Legacy DTMF menu handler |
| `POST` | `/api/public/twilio/gather` | DTMF digit gather handler |
| `GET`  | `/api/khataos/health` | Health check + feature flags |

---

## Deployment

This project is built on **Lovable** with automatic deployment:

1. **Frontend** — Click **Publish** → **Update** to push UI changes live.
2. **Backend** — Server functions and database migrations deploy automatically on every save.

**Preview URL:** `https://id-preview--750fb6ad-0e44-4839-8ebb-8ee909060d69.lovable.app`

**Published URL:** `https://khataos.lovable.app`

Because GitHub two-way sync is enabled, pushing to the connected repo will also sync changes back into Lovable.

---

## Database Schema (Supabase)

Key tables managed by Supabase migrations:

| Table | Purpose |
|-------|---------|
| `orders` | Voice + in-app orders with items, amounts, status, trust score, credit recommendation |
| `customers` | Customer profiles with credit limit, outstanding, trust score, reliability |
| `user_roles` | RBAC (admin / moderator / user) with `has_role()` security definer |
| `inventory` | Shop inventory with expiry dates, quantities, costs |
| `transactions` | Ledger entries (credit, repayment, adjustment) |

All tables use **Row Level Security (RLS)** with explicit `GRANT` statements.

---

## Voice Feature Flags

| Flag | How to enable |
|------|---------------|
| Quick Voice | Works in any modern browser with `SpeechRecognition` API |
| Call Agent | Set `SARVAM_API_KEY` + `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` |
| Sarvam TTS | Requires `SARVAM_API_KEY` (falls back to Twilio `<Say>` if missing) |

---

## Roadmap

- [x] Quick Voice ordering (browser)
- [x] Phone call ordering (Twilio + Sarvam)
- [x] Multi-agent Financial Brain
- [x] Live call monitor for retailers
- [x] Trust score system
- [x] Multilingual support (5 languages)
- [ ] WhatsApp Business API integration
- [ ] UPI repayment linking
- [ ] On-device LLM inference (WebLLM)
- [ ] Regional price index for better estimates

---

## License

MIT — built with ❤️ on [Lovable](https://lovable.dev).

---

**Contributors:**
- Product & AI Design — Lovable AI
- Voice Pipeline — Sarvam AI + Twilio
- Hosting — Lovable Cloud (Supabase)
