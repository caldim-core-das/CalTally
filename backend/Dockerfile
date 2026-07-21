# --- Stage 1: Build & Dependencies ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build tools for native packages (e.g. sqlite3 build requirements)
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./

# Install dependencies (including devDependencies if needed for builds, or just production dependencies)
RUN npm ci

COPY . .

# --- Stage 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/ ./

EXPOSE 5000

# Run container as non-root user for security compliance
USER node

CMD ["node", "server.js"]
