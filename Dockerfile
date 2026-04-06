# ---------------------------------------------------------------------------
# Multi-stage Docker build for assembly-api-mcp
# ---------------------------------------------------------------------------

# --- Build stage ---
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3000

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN addgroup -S assembly && adduser -S assembly -G assembly
USER assembly

EXPOSE ${MCP_PORT:-3000}

CMD ["node", "dist/index.js", "remote"]
