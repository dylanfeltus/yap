# Yap

Open source AI-powered social media management. Plan, draft, schedule, and post across X and LinkedIn.

## What is Yap?

Yap is a workspace where AI agents and humans collaborate on social media content. Your agents create drafts, schedule posts, and find reply opportunities — you review and approve with one click.

**Yap is not an AI product.** It's the platform where your existing AI agents (Claude, OpenClaw, or any API-compatible agent) interface with your social accounts.

## Features

### 📋 Drag-and-Drop Planner
The planner is the heart of Yap — a weekly grid where you manage all your content:
- **Draft queue** on the left — drag drafts into time slots on the right
- **Weekly slot grid** — Morning, Afternoon, Evening blocks across Mon-Sun
- **Placeholder notes** — Drop reminders like "something about GUARDRAILS here" into future slots
- **5-state visual system** — Instantly see what's empty, planned, drafted, approved, or posted at a glance
- **One-click approve/unapprove** — Click any draft in a slot to change its status

### 📝 Draft Workshop
Full-featured draft editor with:
- Multi-platform support (X, LinkedIn, Article)
- Thread composer for multi-part posts
- A/B variations for testing different copy
- Content lanes and product tags for organization
- Attachment management

### 🎯 Reply Guy
Surface high-opportunity posts to reply to:
- Set up reply targets (accounts + keywords to monitor)
- AI-generated reply suggestions
- One-click copy to clipboard
- Mobile-friendly with collapsible target sidebar

### 🎙️ Voice Profiles
Define AI writing voices for each platform so agent-generated content sounds like you.

### 🔌 Agent-Friendly API
Full REST API with Bearer token auth. Give your agent the API key and let it:
- Create and manage drafts
- Schedule posts into planner slots
- Find reply opportunities
- Read your voice profiles and content plan

See `/llms.txt` for the full API reference (designed for AI agents to read).

### ⏰ Auto-Scheduling
Approved drafts in planner slots automatically post when the scheduled time arrives.

## Platforms

- ✅ X (Twitter) — Full support (OAuth 2.0)
- 🔜 LinkedIn — Coming soon

## Quick Start

```bash
git clone https://github.com/dylanfeltus/yap.git
cd yap
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3333](http://localhost:3333)

### Connect X Account
1. Create an X Developer App at [developer.x.com](https://developer.x.com)
2. Set callback URL to `http://localhost:3333/api/auth/x/callback`
3. Add your credentials to `.env`:
   ```
   X_CLIENT_ID=your_client_id
   X_CLIENT_SECRET=your_client_secret
   ```
4. Click "Connect X Account" in the sidebar

## Architecture

- **Next.js 15** (App Router) — UI and API routes
- **Prisma** + SQLite — Local database (zero config)
- **Tailwind** + shadcn/ui — Dark theme UI
- **@dnd-kit** — Drag-and-drop planner
- **SSE** — Real-time live updates across tabs

## Pages

| Page | What it does |
|---|---|
| `/planner` | Drag-and-drop weekly planner with draft queue |
| `/drafts` | Full draft editor (create, edit, threads, variations) |
| `/ideas` | Content idea backlog |
| `/replies` | Reply Guy — find and respond to relevant posts |
| `/settings` | Voice profiles and configuration |

## Self-Host vs Hosted

| | Self-hosted | Hosted (yap.ninja) |
|---|---|---|
| Price | Free forever | $10/mo |
| X API keys | Bring your own | Bring your own (or use ours) |
| Data | On your machine | Cloud (Supabase) |
| Setup | 5 minutes | Sign up and go |
| Budget tracking | — | Built-in ($20/mo default) |

Hosted version at [yap.ninja](https://yap.ninja).

## License

MIT — do whatever you want with it.

Built by [Dylan Feltus](https://x.com/DylanFeltus)
