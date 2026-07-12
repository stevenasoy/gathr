# Gathr

> Book extraordinary venues for weddings, offsites, parties, and shoots across the Philippines.

## Quick Start

```bash
# Install all dependencies (from root)
npm install

# Start the web app
npm run dev

# Start the API server
npm run dev:api

# Start the interactive demo
npm run dev:demo
```

## System Overview

```
┌─────────────┐      ┌─────────────┐
│  @gathr/web │      │ @gathr/demo │
│  (React)    │      │ (Three.js)  │
└──────┬──────┘      └─────────────┘
       │
       ▼
┌──────────────┐
│  @gathr/api  │
│  (Express)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Supabase   │
│ (PostgreSQL) │
└──────────────┘
```

## Monorepo Structure

```
gathr/
├── apps/
│   ├── web/        → Main React frontend (@gathr/web)
│   ├── api/        → Express backend API (@gathr/api)
│   └── demo/       → Interactive 3D product demo (@gathr/demo)
├── packages/
│   └── shared/     → Shared utilities & components (@gathr/shared)
├── supabase/       → Database schemas & migrations
├── decks/          → Business pitch decks
└── docs/           → Project documentation
```

## Documentation

- [Getting Started](./docs/getting-started.md) — Dev environment setup guide
- [API Reference](./docs/api-reference.md) — Backend API endpoints
- [Contributing](./docs/contributing.md) — How to contribute

## Tech Stack

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Frontend   | React 18, React Router, Vite      |
| Backend    | Express 5, Node.js                |
| Database   | Supabase (PostgreSQL)             |
| Styling    | Vanilla CSS                       |
| Icons      | Lucide React                      |
| 3D Demo    | Three.js, React Three Fiber/Drei  |

## Environment Variables

Copy the `.env.example` files in each app and fill in your credentials:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```
