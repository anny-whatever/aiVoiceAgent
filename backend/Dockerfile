# ===========================
# Stage 1: Builder
# ===========================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies (with dev, so we have typescript)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build


# ===========================
# Stage 2: Runtime
# ===========================
FROM node:18-alpine AS runtime

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built JS files from builder
COPY --from=builder /app/dist ./dist

# Copy any other required runtime files
COPY --from=builder /app/package.json ./package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
 && adduser -S backend -u 1001

# Create data dir
RUN mkdir -p /app/data && chown -R backend:nodejs /app

USER backend

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the app
CMD ["node", "dist/index.js"]
