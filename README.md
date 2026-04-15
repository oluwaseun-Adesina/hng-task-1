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
   ```bash
   npx prisma migrate dev --name init
   ```
3. Run the server:
   ```bash
   npm start
   ```

## Tech Stack
- Node.js
- Express
- TypeScript
- Prisma ORM
- SQLite
- Axios (HTTP client)
- uuidv7
