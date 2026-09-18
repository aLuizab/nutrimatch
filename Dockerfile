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

# A self-contained install of just the Prisma CLI, used only to run `migrate deploy` at boot.
#
# The CLI cannot be assembled by cherry-picking directories out of the app's node_modules: its
# own dependencies (`effect`, reached through `@prisma/config`, among others) sit at the root of
# node_modules, outside both `prisma/` and `@prisma/`. Copying those three directories looks
# like it should work and fails at runtime with "Cannot find module", and the exact set changes
# between Prisma releases. Letting npm resolve the tree costs ~170 MB and is correct by
# construction; copying the app's whole node_modules instead would cost ~880 MB.
#
# The version comes from the lockfile so it can never drift from @prisma/client — a CLI newer
# than the client can write migrations the client cannot read.
FROM node:20-alpine AS migrator
WORKDIR /migrator
COPY package-lock.json /tmp/lock.json
RUN npm init -y > /dev/null && \
    npm i --no-audit --no-fund "prisma@$(node -p "require('/tmp/lock.json').packages['node_modules/prisma'].version")" && \
    rm /tmp/lock.json

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma pings a version-check endpoint on every CLI run; at boot that is a network round trip
# between the container starting and the server listening, for information nobody reads.
ENV CHECKPOINT_DISABLE=1
# The real DATABASE_URL (Postgres) is injected by the hosting platform at runtime — this is
# only a placeholder so `prisma migrate deploy` has a syntactically valid fallback if it's ever
# missing, and will fail loudly (connection refused) rather than silently using SQLite.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# `output: standalone` leaves public/ and .next/static out of the trace, so Next requires both
# to be copied by hand. public/ must therefore exist in the repo — COPY fails the whole build
# when its source is missing, which is exactly what happened while this project had no public/
# at all. Keep robots.txt there even if nothing else is.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# next.config.js lists @prisma/client under serverExternalPackages, so it is deliberately not
# bundled — it and the generated client in .prisma must exist in node_modules at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# The schema and migrations, read by the migrator below.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --from=migrator /migrator/node_modules /migrator/node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# The CLI is called through its entry file rather than `npx prisma`: npm creates the
# node_modules/.bin shim at install time and `output: standalone` never emits that directory,
# so npx has nothing to resolve and exits with "sh: prisma: not found". build/index.js is
# precisely what the shim would exec.
# `exec` on the server so it replaces the shell and receives SIGTERM directly — otherwise the
# signal stops at `sh` and the platform kills the container instead of letting it drain.
# SKIP_MIGRATIONS existe por causa de um arranjo temporário: staging e produção ainda
# compartilham o mesmo banco. Sem esta trava, subir staging com uma migração nova a aplicaria
# no banco de produção — antes do código que precisa dela chegar lá, e sem ninguém decidir isso.
# É o contrário do que um ambiente de homologação serve para fazer. Deve valer 1 em staging
# enquanto os bancos não forem separados, e nunca em produção.
CMD ["sh", "-c", "if [ \"$SKIP_MIGRATIONS\" = \"1\" ]; then echo '[boot] SKIP_MIGRATIONS=1: migrations nao aplicadas neste ambiente'; else node /migrator/node_modules/prisma/build/index.js migrate deploy --schema /app/prisma/schema.prisma; fi && exec node server.js"]
