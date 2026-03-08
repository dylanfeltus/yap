# Contributing to Yap

Thanks for your interest in contributing! Yap is open source and welcomes contributions.

## Getting Started

1. Fork the repo
2. Clone your fork
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and fill in your API keys
5. Set up the database: `npx prisma db push`
6. Start dev server: `npm run dev`

## Development

- **Framework:** Next.js (App Router)
- **Database:** Prisma + SQLite
- **Styling:** Tailwind CSS + shadcn/ui
- **Icons:** Lucide React only
- **Port:** 3333

## Code Style

- TypeScript strict mode
- No `any` types
- No `console.log` in production code
- Components under 300 lines — extract if larger
- Error handling on all API routes

## Pull Requests

- One feature per PR
- Write a clear description of what and why
- Make sure `npx tsc --noEmit` passes
- Test your changes locally before submitting

## Architecture

Yap is intentionally simple:
- **No built-in AI** — AI comes from external agents via MCP
- **SQLite** — no external database needed
- **Single process** — `npm run dev` runs everything

## MCP Development

The MCP server lives at `src/mcp/server.ts`. To test:
```bash
npm run mcp
```

## Questions?

Open an issue or reach out to [@DylanFeltus](https://x.com/DylanFeltus) on X.
