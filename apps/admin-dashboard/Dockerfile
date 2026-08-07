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

# Build
RUN pnpm --filter admin-dashboard build

# Deploy isolated production package
RUN pnpm deploy --legacy --filter admin-dashboard --prod /pruned

# Stage 2: Runtime
FROM nginx:alpine

# Copy only the compiled output and config from the pruned directory
COPY --from=builder /pruned/dist /usr/share/nginx/html

# Assuming nginx.conf is at the root of the app
COPY --from=builder /pruned/nginx.conf /etc/nginx/conf.d/default.conf || true

EXPOSE 4003

CMD ["nginx", "-g", "daemon off;"]
