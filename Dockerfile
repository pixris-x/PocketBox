# ============================================================
# PocketBox Web
# ============================================================

FROM m.daocloud.io/docker.io/library/node:22-alpine AS build

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@10.27.0 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build


FROM m.daocloud.io/docker.io/library/node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3111

COPY --from=build /app/dist ./dist
COPY deploy/server.js ./deploy/server.js

EXPOSE 3111

CMD ["node", "deploy/server.js"]