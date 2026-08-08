# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY . .

RUN pnpm install

WORKDIR /app/apps/tenant-dashboard

RUN pnpm build


# Production stage
FROM nginx:alpine

COPY --from=builder /app/apps/tenant-dashboard/dist /usr/share/nginx/html

COPY apps/tenant-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4002

CMD ["nginx", "-g", "daemon off;"]
