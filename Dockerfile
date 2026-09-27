# syntax=docker/dockerfile:1.4
FROM node:18-alpine AS base

# Install openssl for any crypto needs
RUN apk add --no-cache openssl

# Enable pnpm@10 via corepack (built into Node 18)
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# ─── Copy workspace manifest files first (layer cache optimisation) ───────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# artifacts
COPY artifacts/api-server/package.json        ./artifacts/api-server/
COPY artifacts/diet-assistant/package.json    ./artifacts/diet-assistant/
COPY artifacts/mockup-sandbox/package.json    ./artifacts/mockup-sandbox/

# lib
COPY lib/api-client-react/package.json                      ./lib/api-client-react/
COPY lib/api-spec/package.json                              ./lib/api-spec/
COPY lib/api-zod/package.json                               ./lib/api-zod/
COPY lib/db/package.json                                    ./lib/db/
COPY lib/integrations-openai-ai-react/package.json         ./lib/integrations-openai-ai-react/
COPY lib/integrations-openai-ai-server/package.json        ./lib/integrations-openai-ai-server/

# scripts
COPY scripts/package.json ./scripts/

# ─── Install all dependencies (frozen = reproducible) ─────────────────────────
RUN pnpm install --frozen-lockfile

# ─── Copy full source ─────────────────────────────────────────────────────────
COPY . .

# ─── Build ────────────────────────────────────────────────────────────────────
RUN pnpm run build

# ─── Runtime ──────────────────────────────────────────────────────────────────
EXPOSE 5000

CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
