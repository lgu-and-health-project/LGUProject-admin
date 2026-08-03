FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json* pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/tenant-api/package.json ./apps/tenant-api/
COPY apps/admin-api/package.json ./apps/admin-api/
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/
COPY apps/tenant-dashboard/package.json ./apps/tenant-dashboard/

RUN pnpm install --frozen-lockfile

COPY . .

RUN cd apps/tenant-api && pnpm exec prisma generate
RUN pnpm --filter tenant-api build

FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json* pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/tenant-api/package.json ./apps/tenant-api/

RUN pnpm install --prod --filter tenant-api...

COPY --from=builder /app/apps/tenant-api/dist ./apps/tenant-api/dist
COPY --from=builder /app/apps/tenant-api/prisma ./apps/tenant-api/prisma

WORKDIR /app/apps/tenant-api

RUN npx prisma generate

EXPOSE 4001

CMD ["pnpm", "start:prod"]
