ARG PROJECT="@latitude-data/core"
ARG RAILWAY_GIT_REPO_OWNER
ARG RAILWAY_GIT_REPO_NAME
ARG RAILWAY_GIT_COMMIT_SHA

FROM node:22-alpine AS alpine

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

FROM alpine AS base

# Will be used to cache pnpm store
RUN npm install -g corepack@0.31.0 && corepack enable

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN pnpm i -g turbo

FROM base AS runner

ARG PROJECT
ARG RAILWAY_GIT_REPO_OWNER
ARG RAILWAY_GIT_REPO_NAME
ARG RAILWAY_GIT_COMMIT_SHA

RUN mkdir -p /app
# Clone the repository
RUN git clone https://github.com/$RAILWAY_GIT_REPO_OWNER/$RAILWAY_GIT_REPO_NAME.git /app

WORKDIR /app
RUN git checkout $RAILWAY_GIT_COMMIT_SHA

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/core/package.json ./packages/core/

RUN pnpm install \
  --frozen-lockfile \
  --filter "${PROJECT}..."

# COPY packages/core/ ./packages/core/

CMD ["pnpm", "--prefix", "packages/core", "db:migrate"]

