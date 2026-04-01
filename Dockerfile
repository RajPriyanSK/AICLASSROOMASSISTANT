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

# Install dependencies (regular install is more stable if BuildKit crashes)
RUN pnpm install --frozen-lockfile

# Build the monorepo (skipping typecheck to save memory/time)
# This only builds classroom frontend and bundles api-server
RUN pnpm -r --filter "@workspace/classroom" --filter "@workspace/api-server" run build

# --- Runner Stage ---
FROM node:22-alpine AS runner
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
