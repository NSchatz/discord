# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile --prod
RUN pnpm exec prisma generate

COPY --from=builder /app/dist ./dist/

RUN addgroup -g 1001 -S botuser && adduser -S botuser -u 1001
USER botuser

CMD ["node", "dist/index.js"]
