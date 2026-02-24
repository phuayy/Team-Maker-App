# ⚡ TeamMaker — Smart Team Assignment

Automatically create balanced teams from Google Sheets sign-up forms. Skill-based, gender-balanced assignments with real-time updates, drag-and-drop editing, and shareable guest links.

---

## Features

- **Google Sheets Sync** — Link a Google Forms response sheet and pull player data with one click. Supports incremental sync (new rows only).
- **Smart Team Assignment** — Balanced by skill level (1-5), gender distribution, and friend-group requests (unique team IDs). Max 8 players per team.
- **Drag & Drop** — Admins and club owners can manually rearrange players across teams by dragging player cards.
- **Role-Based Access** — Club Owner, Admin, and Guest roles. Guests see a read-only view via shared link.
- **Real-Time Updates** — Powered by Supabase Realtime. Changes broadcast instantly to all connected clients.
- **Shareable Sessions** — Copy a public link to share with players (read-only guest view).

---

## Tech Stack

| Layer         | Technology                                        |
| ------------- | ------------------------------------------------- |
| Framework     | Next.js 16 (App Router, JSX)                      |
| Styling       | Vanilla CSS with CSS custom properties             |
| Database      | PostgreSQL via Supabase + Prisma ORM               |
| Auth          | NextAuth.js v5 (Google OAuth)                      |
| Google Sheets | `googleapis` (Sheets API v4, service account)      |
| Real-Time     | Supabase Realtime (managed WebSockets)             |
| Drag & Drop   | `@hello-pangea/dnd`                                |
| Icons         | `lucide-react`                                     |
| Deployment    | Vercel (frontend + API) + Supabase (DB + Realtime) |

---

## Prerequisites

1. **Node.js** ≥ 18
2. **Supabase** project (free tier) — provides PostgreSQL + Realtime
3. **Google Cloud** OAuth 2.0 Client ID — for sign-in
4. **Google Cloud** Service Account — for reading Google Sheets server-side (enable Sheets API)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env` to `.env.local` and fill in your real credentials:

```bash
cp .env .env.local
```

| Variable                       | Where to get it                                             |
| ------------------------------ | ----------------------------------------------------------- |
| `DATABASE_URL`                 | Supabase → Project Settings → Database → Connection string  |
| `DIRECT_URL`                   | Supabase → Project Settings → Database → Direct connection  |
| `NEXT_PUBLIC_SUPABASE_URL`     | Supabase → Project Settings → API → URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase → Project Settings → API → anon/public key         |
| `AUTH_GOOGLE_ID`               | Google Cloud Console → Credentials → OAuth 2.0 Client ID    |
| `AUTH_GOOGLE_SECRET`           | Google Cloud Console → Credentials → OAuth 2.0 Client Secret|
| `AUTH_SECRET`                  | Random string (`openssl rand -base64 32`)                   |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud Console → IAM → Service Accounts               |
| `GOOGLE_PRIVATE_KEY`           | Service Account JSON key file → `private_key` field         |

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.js   # NextAuth handler
│   │   ├── clubs/                        # CRUD for clubs & members
│   │   └── sessions/                     # Session CRUD, sync, assign, swap, players
│   ├── club/[clubId]/                    # Club dashboard page
│   ├── dashboard/                        # User's clubs list
│   ├── login/                            # Google OAuth login page
│   ├── session/[sessionId]/              # Public session view (guest)
│   ├── globals.css                       # Design system & theme
│   ├── layout.js                         # Root layout with auth + navbar
│   └── page.js                           # Landing page
├── components/
│   ├── AuthProvider.jsx                  # NextAuth SessionProvider
│   └── Navbar.jsx                        # App navigation bar
├── hooks/
│   └── useRealtimeSession.js             # Supabase Realtime hook
└── lib/
    ├── auth.js                           # NextAuth config & callbacks
    ├── authHelpers.js                    # Role-checking utilities
    ├── prisma.js                         # Prisma client (lazy-init)
    ├── sheets.js                         # Google Sheets API service
    ├── supabase.js                       # Supabase client + helpers
    └── teamAssigner.js                   # Team balancing algorithm
```

---

## Team Assignment Algorithm

The auto-assignment algorithm follows this priority:

1. **Group friends** — Players with matching "Unique Team ID" are placed on the same team
2. **Balance skill** — Teams are equalized by average skill level (1-5 scale)
3. **Balance gender** — Genders distributed as evenly as possible
4. **Cap at 8** — No team exceeds 8 players

---

## API Routes

| Method | Endpoint                                    | Description                     |
| ------ | ------------------------------------------- | ------------------------------- |
| GET    | `/api/clubs`                                | List user's clubs               |
| POST   | `/api/clubs`                                | Create a new club               |
| GET    | `/api/clubs/[clubId]`                       | Get club details                |
| PATCH  | `/api/clubs/[clubId]`                       | Update club                     |
| POST   | `/api/clubs/[clubId]/members`               | Add a club member               |
| POST   | `/api/clubs/[clubId]/sessions`              | Create a session                |
| GET    | `/api/sessions/[sessionId]`                 | Get session + teams + players   |
| PATCH  | `/api/sessions/[sessionId]`                 | Update session                  |
| GET    | `/api/sessions/[sessionId]/players`         | List players in session         |
| POST   | `/api/sessions/[sessionId]/sync`            | Sync players from Google Sheet  |
| POST   | `/api/sessions/[sessionId]/assign`          | Auto-assign all players to teams|
| POST   | `/api/sessions/[sessionId]/swap`            | Swap two players between teams  |

---

## Deployment (Vercel)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Set all environment variables in Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

Make sure to update `NEXTAUTH_URL` and the Google OAuth redirect URI to your production Vercel URL.

---

## License

Private — all rights reserved.
