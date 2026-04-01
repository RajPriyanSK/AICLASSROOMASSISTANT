# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# Install pnpm and setup environment
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- Builder Stage ---
FROM base AS builder
WORKDIR /app

# Copy everything for the build
COPY . .

# Install dependencies with cache mount for speed
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the monorepo (builds classroom frontend and api-server)
# Note: Ensure .env is present if build-time variables (VITE_*) are required
RUN pnpm run build

# --- Runner Stage ---
FROM node:22-slim AS runner
WORKDIR /app

# Copy the built server and frontend
COPY --from=builder /app/artifacts/api-server/dist /app/artifacts/api-server/dist
COPY --from=builder /app/artifacts/classroom/dist /app/artifacts/classroom/dist

# Default environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the API server port
EXPOSE 5000

# Start the application using the bundled file directly
CMD ["node", "artifacts/api-server/dist/index.cjs"]
