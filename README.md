# Stage 2 (BACKEND) Task: Intelligence Query Engine

## Description

A queryable demographic intelligence REST API. Stores 2026 seeded profiles and exposes advanced filtering, sorting, pagination, and a natural language query interface.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment — set `DATABASE_URL` to a PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
   ```
3. Run migrations and start:
   ```bash
   npm start
   ```
   `prestart` runs `prisma migrate deploy` then compiles TypeScript. `start` seeds the database then launches the server.

To seed manually:
```bash
npm run seed
```
Re-running seed is safe — it skips existing records.

## API Endpoints

### `POST /api/profiles`
Creates a profile by fetching data from Genderize, Agify, and Nationalize.
- Body: `{ "name": "Amara" }`
- Returns the created or existing profile.

### `GET /api/profiles`
List profiles with filtering, sorting, and pagination.

**Filter params:**
| Param | Type | Description |
|---|---|---|
| `gender` | `male` \| `female` | Exact match |
| `age_group` | `child` \| `teenager` \| `adult` \| `senior` | Exact match |
| `country_id` | ISO 2-letter code (e.g. `NG`) | Exact match |
| `min_age` | integer | Minimum age (inclusive) |
| `max_age` | integer | Maximum age (inclusive) |
| `min_gender_probability` | float 0–1 | Minimum gender confidence |
| `min_country_probability` | float 0–1 | Minimum country confidence |

**Sorting params:**
| Param | Values | Default |
|---|---|---|
| `sort_by` | `age` \| `created_at` \| `gender_probability` | `created_at` |
| `order` | `asc` \| `desc` | `desc` |

**Pagination params:** `page` (default 1), `limit` (default 10, max 50)

**Example:** `/api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=asc`

**Response:**
```json
{ "status": "success", "page": 1, "limit": 10, "total": 46, "data": [ ... ] }
```

### `GET /api/profiles/search?q=<query>`
Natural language query. Rule-based parsing only — no AI/LLMs.

**Example queries:**
- `young males from nigeria` → gender=male, min_age=16, max_age=24, country_id=NG
- `females above 30` → gender=female, min_age=30
- `adult males from kenya` → gender=male, age_group=adult, country_id=KE
- `male and female teenagers above 17` → age_group=teenager, min_age=17
- `people from angola` → country_id=AO

Uninterpretable queries return: `{ "status": "error", "message": "Unable to interpret query" }`

Pagination params `page` and `limit` are supported.

### `GET /api/profiles/:id`
Returns a single profile by UUID.

### `DELETE /api/profiles/:id`
Deletes a profile. Returns `204 No Content`.

## Natural Language Parsing Logic

The parser tokenises the query using regex and applies rules in this order:

1. **Gender** — detects `male/males/men/man/boy/boys` or `female/females/women/woman/girl/girls`. If both are present, no gender filter is applied.
2. **"young"** — maps to `min_age=16, max_age=24` (not a stored age group).
3. **Age group keywords** — `child/children`, `teen/teenager`, `adult`, `senior/elderly`.
4. **Explicit age ranges** — `above/over/older than N` → `min_age=N`; `below/under/younger than N` → `max_age=N`. These override the "young" bounds when specified.
5. **Country names** — matched against a 150+ country name dictionary (including aliases like "ivory coast" → CI, "dr congo" → CD). Longest match wins to avoid partial collisions.

If no rule fires, the endpoint returns the "Unable to interpret query" error.

## Error Responses

```json
{ "status": "error", "message": "<description>" }
```

| Code | Meaning |
|---|---|
| 400 | Missing or empty parameter |
| 422 | Invalid parameter type or value |
| 404 | Profile not found |
| 500/502 | Server or upstream API failure |

## Tech Stack

- Node.js + TypeScript
- Express 5
- Prisma ORM (PostgreSQL)
- UUID v7
- Axios

## Deployment

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Set `DATABASE_URL` in environment variables.
- CORS: `Access-Control-Allow-Origin: *`
- All timestamps UTC ISO 8601.
- All IDs UUID v7.
