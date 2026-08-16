FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
# Never a real connection — `prisma generate` only reads the schema to emit types, but it does
# validate the URL matches the datasource provider's format, so this needs to look like a real
# postgresql:// URL even though nothing ever connects to it at build time.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# The real DATABASE_URL (Postgres) is injected by the hosting platform at runtime — this is
# only a placeholder so `prisma migrate deploy` has a syntactically valid fallback if it's ever
# missing, and will fail loudly (connection refused) rather than silently using SQLite.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# `output: 'standalone'` traces JS imports, but the Prisma CLI (needed below for
# `migrate deploy`) is invoked as a binary, not imported — copy it and the schema/migrations
# explicitly rather than relying on trace output to include them.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
