FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/tenant-api/package.json ./apps/tenant-api/
COPY apps/admin-api/package.json ./apps/admin-api/
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/
COPY apps/tenant-dashboard/package.json ./apps/tenant-dashboard/

RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXT_PUBLIC_API_URL=http://localhost:4001

RUN pnpm --filter tenant-dashboard build

FROM nginx:alpine

COPY --from=builder /app/apps/tenant-dashboard/out /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
