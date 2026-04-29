FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client (no DB needed at build time)
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npx tsc


FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY seed_profiles.json ./

RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist/

EXPOSE 8080

ENV PORT=8080

# Run migrations + seed + server at container startup
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed.js && node dist/index.js"]
