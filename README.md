# Stage 1 (BACKEND) Task: Data Persistence & API Design Assessment

## Description

A REST API that aggregates data from three external sources (Genderize, Agify, Nationalize), applies classification logic, and stores the results in a database with idempotency handling.

## Features

- `POST /api/profiles`: Creates or retrieves a profile by name.
- External API aggregation.
- Age group classification.
- UUID v7 generation.
- Idempotency (returns "Profile already exists" if record found).
- SQLite persistence with Prisma ORM.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up database:
   1. Set `DATABASE_URL` to your PostgreSQL connection string.
      Example:
      ```env
      DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
      ```
   2. Run migrations:
      ```bash
      npx prisma migrate deploy
      ```
3. Run the server:
   ```bash
   npm start
   ```
   This will build the project first via the `prestart` hook.

## API Endpoints

- `POST /api/profiles`
  - Body: `{ "name": "ella" }`
  - Returns profile data or the existing profile if submitted again.
- `GET /api/profiles/{id}`
  - Returns a single profile by UUID.
- `GET /api/profiles`
  - Optional query params: `gender`, `country_id`, `age_group`
  - Returns filtered profile list and `count`.
- `DELETE /api/profiles/{id}`
  - Removes a profile and returns `204 No Content`.

## Deployment notes

- Build command: `npm install && npm run build`
- Start command: `npm start`
- In hosted environments, set `DATABASE_URL` in service environment variables.

## Tech Stack

- Node.js
- Express
- TypeScript
- Prisma ORM
- SQLite
- Axios (HTTP client)
- uuidv7
