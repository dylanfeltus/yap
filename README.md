# Content Command Center

A self-hosted content management dashboard for creators. Manage ideas, draft posts, schedule publishing to X and LinkedIn, track analytics, and curate reply opportunities — all from one local-first interface.

## Features

- **Idea Bank** — Capture and organize content ideas with tags and filters
- **Draft Workshop** — Write, review, and approve posts with A/B variations and thread support
- **Content Calendar** — Visual week/month view with drag-to-reschedule
- **Scheduler** — Configurable time slots, auto-publish via X and LinkedIn APIs
- **Reply Guy** — Surface high-engagement posts and generate AI reply suggestions
- **Analytics** — Track impressions, likes, retweets, bookmarks across platforms
- **Voice Profiles** — Define your writing voice per platform for AI-generated content

## Quick Start

```bash
# Install dependencies
npm install

# Set up your environment
cp .env.example .env
# Edit .env with your API keys

# Initialize the database
npx prisma migrate dev

# Start the dev server
npm run dev
```

Open [http://localhost:3333](http://localhost:3333).

## Configuration

Set your content lanes and product tags via environment variables:

```env
NEXT_PUBLIC_CONTENT_LANES=Marketing,Engineering,Design,Culture
NEXT_PUBLIC_CONTENT_PRODUCTS=App,CLI,API,Docs
```

Or edit the defaults in `src/lib/utils.ts`.

## Stack

- **Next.js** (App Router) — Framework
- **Tailwind CSS + shadcn/ui** — Styling
- **Prisma + SQLite** — Local database, zero config
- **Claude API** — AI features (reply suggestions, draft variations)
- **X API v2** — Publishing and analytics
- **LinkedIn API** — Publishing and analytics

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite path (default: `file:./dev.db`) |
| `CLAUDE_API_KEY` | For AI | Claude API key for content generation |
| `X_CLIENT_ID` | For X | X OAuth 2.0 client ID |
| `X_CLIENT_SECRET` | For X | X OAuth 2.0 client secret |
| `X_BEARER_TOKEN` | For Reply Guy | X app-level bearer token |
| `LINKEDIN_CLIENT_ID` | For LinkedIn | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | For LinkedIn | LinkedIn OAuth client secret |

## API

Exposes REST endpoints for external integrations:

- `POST /api/ideas` — Submit content ideas
- `POST /api/drafts` — Push drafts for review
- `GET /api/drafts?status=draft` — List pending drafts
- `PATCH /api/drafts/:id` — Approve, reject, or edit
- `GET /api/analytics/summary` — Performance summary

## License

MIT
