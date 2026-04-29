# Insighta Labs+ Backend

Secure, multi-interface Profile Intelligence System — Stage 3.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Insighta Labs+                       │
├──────────────┬──────────────────┬───────────────────────┤
│   CLI Tool   │   Web Portal     │   Direct API          │
│ (insighta)   │ (Express SSR)    │ (REST / JSON)         │
└──────┬───────┴────────┬─────────┴──────────┬────────────┘
       │                │                     │
       └────────────────┴─────────────────────┘
                        │
            ┌───────────▼────────────┐
            │      Backend API       │
            │   Express + Prisma     │
            │   PostgreSQL (Aiven)   │
            └────────────────────────┘
```

Three separate repos:
- **Backend** (this repo) — REST API, auth, business logic
- **CLI** — `insighta` command-line tool
- **Web Portal** — Server-rendered web interface

## Setup

```bash
npm install
```

Required environment variables (see `.env`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `FRONTEND_URL` | Web portal origin (for post-login redirect) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

Create a GitHub OAuth App at https://github.com/settings/developers with callback URL:
- Development: `http://localhost:3001/auth/github/callback`
- Production: `https://<your-backend>/auth/github/callback`

```bash
npm run dev    # development
npm start      # production (builds first, then migrates + seeds)
```

## Authentication Flow

### GitHub OAuth with PKCE (CLI)

```
insighta login
    │
    ├─ Generate: state, code_verifier, code_challenge (SHA-256)
    ├─ Start local callback server on :9876
    ├─ Open browser → GET /auth/github?state=...&code_challenge=...
    │
    │  [User authenticates on GitHub]
    │
    ├─ GitHub → http://localhost:9876/callback?code=...&state=...
    ├─ CLI validates state
    └─ CLI → GET /auth/github/callback?code=...&code_verifier=...&source=cli
                │
                ├─ Backend exchanges code + verifier with GitHub
                ├─ Fetches user info from GitHub API
                ├─ Creates/updates User record
                └─ Returns { access_token, refresh_token, user }
```

### GitHub OAuth (Web Browser)

```
Click "Continue with GitHub"
    │
    └─ GET /auth/github → redirect to GitHub
           │
           └─ GitHub → GET /auth/github/callback
                          │
                          ├─ Creates/updates User record
                          └─ Sets HTTP-only cookies + redirect to /dashboard
```

### Token Lifecycle

| Token | Expiry | Storage |
|---|---|---|
| Access token | 3 minutes | Bearer header (CLI) / HTTP-only cookie (web) |
| Refresh token | 5 minutes | `~/.insighta/credentials.json` (CLI) / HTTP-only cookie (web) |

- Refresh tokens are **single-use** — each refresh issues a new pair and immediately invalidates the old one.
- On logout, the refresh token is revoked server-side.
- CLI auto-refreshes on 401 responses before prompting re-login.

## Role Enforcement

| Role | Permissions |
|---|---|
| `admin` | Full access: list, get, search, create, delete, export |
| `analyst` | Read-only: list, get, search, export |

- Default role on first login: `analyst`
- All `/api/*` routes require authentication.
- `POST /api/profiles` and `DELETE /api/profiles/:id` require `admin` role.
- Users with `is_active = false` receive `403 Forbidden` on all requests.

Role checks are enforced via two composable middlewares:
- `requireAuth` — validates JWT, attaches `req.user`
- `requireRole(...roles)` — checks `req.user.role`

## API Reference

All `/api/*` endpoints require:
- `Authorization: Bearer <token>` header
- `X-API-Version: 1` header

Missing the version header returns `400 { "status": "error", "message": "API version header required" }`.

### Auth Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/auth/github` | Redirect to GitHub OAuth |
| GET | `/auth/github/callback` | OAuth callback — issues tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke session |

### Profile Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/profiles` | any | List with filters, sorting, pagination |
| GET | `/api/profiles/search?q=` | any | Natural language search |
| GET | `/api/profiles/export?format=csv` | any | Export as CSV |
| GET | `/api/profiles/:id` | any | Get single profile |
| POST | `/api/profiles` | admin | Create profile |
| DELETE | `/api/profiles/:id` | admin | Delete profile |

### Pagination Response Shape

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "total_pages": 203,
  "links": {
    "self": "/api/profiles?page=1&limit=10",
    "next": "/api/profiles?page=2&limit=10",
    "prev": null
  },
  "data": [ ... ]
}
```

## Rate Limiting

| Scope | Limit |
|---|---|
| `/auth/*` | 10 requests/minute |
| All other endpoints | 60 requests/minute per user |

Returns `429 Too Many Requests` when exceeded.

## Natural Language Parsing

Rule-based parser (no AI/LLM). Applies rules in order:

1. **Gender** — `male/males/men/man/boys` or `female/females/women/woman/girls`. Both present → no gender filter.
2. **"young"** → `min_age=16, max_age=24`
3. **Age group** — `child/children`, `teen/teenager`, `adult`, `senior/elderly`
4. **Explicit ranges** — `above/over/older than N` → `min_age`, `below/under/younger than N` → `max_age`
5. **Country** — matched against 150+ country name dictionary (aliases: "ivory coast"→CI, "dr congo"→CD, "usa"→US). Longest match wins.

## Tech Stack

- Node.js + TypeScript, Express 5
- Prisma ORM (PostgreSQL)
- JWT (jsonwebtoken), HTTP-only cookies
- express-rate-limit, morgan
- UUID v7

## Deployment

- Build: `npm install && npm run build`
- Start: `npm start`
- Set all env vars listed above.
