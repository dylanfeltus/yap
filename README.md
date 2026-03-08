# Yap

Open source social media management. AI agents write, humans approve.

## What is Yap?

Yap is a platform where AI agents and humans collaborate on social media content. Your agents create drafts, schedule posts, and find reply opportunities. You review everything and approve with one click.

**Yap is not an AI product.** It's the workspace where your existing AI agents (Claude, OpenClaw, or any MCP-compatible agent) interface with your social accounts.

## Features

- 📝 **Draft management** — Create, edit, and organize posts and threads
- ✅ **Approval workflow** — Nothing posts without your say-so
- 📅 **Calendar view** — See your content schedule at a glance
- 🗓️ **Weekly planner** — Set content goals by day, time block, and platform
- 🎯 **Reply Guy** — Surface high-opportunity tweets, draft replies, one-click copy
- 📎 **Media uploads** — Attach up to 4 images per post
- 🔌 **MCP server** — 9 tools for any AI agent to manage your content
- ⏰ **Auto-scheduler** — Posts go out on time, every time

## Platforms

- ✅ X (Twitter) — Full support
- 🔜 LinkedIn — Coming soon

## Quick Start

```bash
git clone https://github.com/dylanfeltus/yap.git
cd yap
npm install
cp .env.example .env
# Add your X API credentials to .env
npx prisma db push
npm run dev
```

Open http://localhost:3333

## MCP Server

Connect your AI agent to Yap:

```bash
npm run mcp
```

Available tools: `create_draft`, `list_drafts`, `update_draft`, `schedule_draft`, `publish_now`, `get_analytics`, `list_reply_candidates`, `add_reply_target`, `get_voice_profile`, `get_weekly_plan`, `get_next_slot`

## Architecture

- **Next.js** (App Router) — UI and API routes
- **Prisma** + SQLite — Local database
- **Tailwind** + shadcn/ui — Styling
- **MCP** — Agent integration protocol

## Self-host vs Hosted

| | Self-hosted | Hosted (yap.ninja) |
|---|---|---|
| Price | Free forever | $10/mo |
| API keys | Bring your own | Bring your own |
| Data | On your machine | Cloud |
| Setup | 5 minutes | Sign up and go |

Hosted version coming soon — [join the waitlist](https://yap.ninja).

## License

MIT — do whatever you want with it.

Built by [Dylan Feltus](https://x.com/DylanFeltus)
