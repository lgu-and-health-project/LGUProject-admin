# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json* pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/tenant-dashboard/package.json ./apps/tenant-dashboard/
COPY apps/tenant-api/package.json ./apps/tenant-api/
COPY apps/admin-api/package.json ./apps/admin-api/
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/
COPY apps/mock-backend/package.json ./apps/mock-backend/

RUN pnpm install

COPY . .

WORKDIR /app/apps/tenant-dashboard

RUN pnpm build


# Production stage
FROM nginx:alpine

COPY --from=builder /app/apps/tenant-dashboard/dist /usr/share/nginx/html

COPY apps/tenant-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4002

CMD ["nginx", "-g", "daemon off;"]
