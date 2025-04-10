ARG PROJECT="@latitude-data/web"
ARG PROJECT_PATH="apps/web"
ARG SENTRY_WEB_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT

ARG RAILWAY_GIT_REPO_OWNER
ARG RAILWAY_GIT_REPO_NAME
ARG RAILWAY_GIT_COMMIT_SHA
ARG RAILWAY_GIT_AUTHOR
ARG RAILWAY_GIT_BRANCH
ARG RAILWAY_GIT_COMMIT_MESSAGE

FROM node:22-alpine AS alpine

# Install build dependencies
RUN apk add --update --no-cache \
  git \
  libc6-compat \
  curl \
  sudo \
  build-base \
  g++ \
  bash \
  wget \
  cmake \
  musl-dev \
  clang \
  llvm \
  python3 \
  pkgconfig \
  pixman-dev \
  cairo-dev \
  pango-dev \
  jpeg-dev \
  giflib-dev \
  librsvg-dev \
  rustup \
  git \
  gn \
  tar \
  ninja

FROM alpine AS base

# Will be used to cache pnpm store
RUN npm install -g corepack@0.31.0 && corepack enable

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"


# Install turbo with npm instead of pnpm to avoid key verification issues
RUN pnpm install -g turbo

FROM base AS pruner

ARG PROJECT
ARG RAILWAY_GIT_REPO_OWNER
ARG RAILWAY_GIT_REPO_NAME
ARG RAILWAY_GIT_COMMIT_SHA

RUN mkdir -p /app
# Clone the repository
RUN git clone https://github.com/$RAILWAY_GIT_REPO_OWNER/$RAILWAY_GIT_REPO_NAME.git /app

# Checkout the specific commit
WORKDIR /app
RUN git checkout $RAILWAY_GIT_COMMIT_SHA

RUN turbo prune "${PROJECT}" --docker

# BUILDER stage
# ------------------------------------------------------
FROM base AS builder

ARG PROJECT
ARG SENTRY_WEB_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_LATITUDE_CLOUD_PAYMENT_URL

ENV SENTRY_WEB_DSN=$SENTRY_WEB_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_LATITUDE_CLOUD_PAYMENT_URL=$NEXT_PUBLIC_LATITUDE_CLOUD_PAYMENT_URL

WORKDIR /app

COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/full/ .

RUN pnpm install \
  --frozen-lockfile \
  --filter "${PROJECT}..."

RUN \
  BUILDING_CONTAINER=true \
  NEXT_TELEMETRY_DISABLED=1 \
  SENTRY_ORG=$SENTRY_ORG \
  SENTRY_PROJECT=$SENTRY_PROJECT \
  SENTRY_WEB_DSN=$SENTRY_WEB_DSN \
  SENTRY_AUTH_TOKEN="$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null || echo '')" \
  NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
  NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
  NEXT_PUBLIC_LATITUDE_CLOUD_PAYMENT_URL=$NEXT_PUBLIC_LATITUDE_CLOUD_PAYMENT_URL \
  pnpm turbo build --filter="${PROJECT}..."

RUN pnpm prune --prod --no-optional

# PRODUCTION
FROM alpine AS runner

ARG PROJECT_PATH

ENV HOSTNAME=0.0.0.0
ENV KEEP_ALIVE_TIMEOUT=601000
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

# Install runtime dependencies for canvas
RUN apk add --no-cache \
  pixman \
  cairo \
  pango \
  libjpeg \
  giflib \
  librsvg \
  libstdc++

# Install AWS CLI using Alpine package manager
RUN apk add --no-cache \
  aws-cli \
  groff \
  less

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/core/src/assets /app/packages/core/src/assets
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set the correct permission for prerender cache
RUN mkdir -p apps/web/.next
RUN mkdir -p apps/web/.next/cache
RUN chown nextjs:nodejs apps/web/.next
RUN chown nextjs:nodejs apps/web/.next/cache

# Copy the standalone server and node_modules
COPY --from=builder --chown=nodejs:nextjs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nextjs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nextjs /app/apps/web/node_modules ./apps/web/node_modules
# Set permissions for local storage
# User ID and Group ID 1001 is used to match the user 'nextjs' and group 'nodejs' in the runner image.
RUN set -e; \
  mkdir -p /app/storage/files; \
  mkdir -p /app/apps/web/public/files; \
  chown -R 1001:1001 /app/storage/files /app/apps/web/public/files

USER nextjs

WORKDIR /app/apps/web

# EXPOSE 8080

CMD ["node", "server.js"]
