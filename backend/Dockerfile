FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY backend/package.json backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile || true
COPY backend/ backend/
COPY packages/shared/ packages/shared/
RUN cd backend && pnpm build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
EXPOSE 3000
CMD ["node", "dist/index.js"]
