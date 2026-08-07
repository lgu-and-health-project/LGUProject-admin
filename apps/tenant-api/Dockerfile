# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /workspace

RUN npm install -g pnpm

# Copy workspace config
COPY package.json* pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.jsons for accurate dependency resolution
COPY apps/tenant-api/package.json ./apps/tenant-api/
COPY apps/admin-api/package.json ./apps/admin-api/
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/
COPY apps/tenant-dashboard/package.json ./apps/tenant-dashboard/

RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Generate Prisma and build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm --filter tenant-api exec prisma generate
RUN pnpm --filter tenant-api build

# Deploy isolated production package
RUN pnpm deploy --legacy --filter tenant-api --prod /pruned
RUN cp -r apps/tenant-api/dist /pruned/dist

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy ONLY the pruned standalone application
COPY --from=builder /pruned .

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

EXPOSE 4001

CMD ["pnpm", "start:prod"]
