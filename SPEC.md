# Content Command Center — Spec

## Overview
A self-hosted content management tool for solo creators and small teams. Manage content ideas, draft posts, schedule publishing, track analytics, and curate reply opportunities — all from one dashboard.

Built for local-first use. Runs on your machine alongside your other tools.

## Stack
- Next.js (App Router)
- Tailwind CSS + shadcn/ui
- SQLite via Prisma (local DB, zero config)
- Claude API for AI features (reply generation, draft variations)

## Pages

### 1. Idea Bank (`/ideas`)
- CRUD for content ideas
- Fields: title, notes, lane tags (configurable), product tags (configurable), platform (X, LinkedIn, Both), status (idea → drafted → scheduled → posted)
- Filter/search by tag, status, platform
- API endpoint for external tools to submit ideas

### 2. Draft Workshop (`/drafts`)
- List of drafts pending review
- Each draft: content text, platform target, suggested schedule time, lane/product tags
- Actions: approve, edit inline, schedule, reject with note
- Support multiple variations per draft (A/B)
- Thread support for X (multi-tweet composer)
- Image/video attachment support
- API endpoint for agents/tools to push drafts

### 3. Content Calendar (`/calendar`)
- Week and month views
- Color coded by lane
- Status colors: ideas (gray), drafts (yellow), scheduled (blue), posted (green)
- Drag to reschedule
- Click to edit/preview

### 4. Scheduler (`/scheduler`)
- Queue with configurable time slots (e.g., 9am, 12pm, 5pm daily)
- Platform-specific scheduling (X and LinkedIn)
- Publish via X API and LinkedIn API
- Support: tweets, threads, quote tweets, image/video posts, LinkedIn posts
- Pipeline: Draft → Scheduled → Posted
- Cron-based publishing (check queue every minute, post when time matches)

### 5. Reply Guy (`/replies`)
**Note: X API does not allow reply posting. This is curation + copy/paste only.**
- Surface high-engagement posts from a configurable watchlist of target accounts and keyword topics
- Filter by: recency, topic/lane, minimum engagement threshold
- Generate AI reply options using Claude API, tuned to your voice profile
- Actions: copy reply text, open original tweet, skip/dismiss
- Track which posts you replied to (manual checkbox after pasting)

### 6. Analytics (`/analytics`)
- Pull engagement data from X API + LinkedIn API for posted content
- Dashboard: impressions, likes, retweets, bookmarks, replies, profile visits
- Performance by lane, time of day, day of week
- Top performers list, trend lines, outlier detection

### 7. Voice Profiles (`/voice`)
- Store and edit voice profile documents per platform
- Fields: platform, profile name, voice description/guidelines, example posts
- Referenced by Reply Guy and Draft Workshop for AI content generation

## Configuration

Content lanes and product tags are configurable via environment variables:

```env
NEXT_PUBLIC_CONTENT_LANES=AI/Builder,Design,Creator Economy,Behind the Scenes
NEXT_PUBLIC_CONTENT_PRODUCTS=Product A,Product B,Product C
```

Or edit the defaults in `src/lib/utils.ts`.

## API Routes (for integrations)
- `POST /api/ideas` — submit an idea
- `POST /api/drafts` — submit a draft
- `GET /api/drafts?status=draft` — list pending drafts
- `PATCH /api/drafts/:id` — approve/reject/edit
- `GET /api/analytics/summary` — get performance summary

## UI/UX
- Dark mode by default
- Clean, minimal — Linear/Raycast aesthetic
- Sidebar navigation
- Primarily desktop

## Environment Variables
- `DATABASE_URL` — SQLite path (default: `file:./dev.db`)
- `CLAUDE_API_KEY` — For AI features
- `X_CLIENT_ID`, `X_CLIENT_SECRET` — X OAuth 2.0 (confidential client)
- `X_BEARER_TOKEN` — For Reply Guy search
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` — LinkedIn OAuth

## Port
Runs on port 3333 by default.
