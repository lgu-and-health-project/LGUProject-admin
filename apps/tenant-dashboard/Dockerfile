FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json* pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/tenant-dashboard/package.json ./apps/tenant-dashboard/

# Install dependencies
RUN pnpm install --filter tenant-dashboard...

# Copy source code
COPY apps/tenant-dashboard ./apps/tenant-dashboard

# Build the app
WORKDIR /app/apps/tenant-dashboard
RUN pnpm build

# Serve with a simple static server
RUN npm install -g serve
EXPOSE 4002

CMD ["serve", "-s", "dist", "-p", "4002"]
