FROM node:22-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.0.9 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

RUN pnpm --version
RUN pnpm install --frozen-lockfile

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm exec prisma generate
RUN pnpm run build
RUN pnpm prisma:deploy && pnpm prisma:seed

FROM base AS runtime

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 4000

CMD ["node", "dist/server.js"]