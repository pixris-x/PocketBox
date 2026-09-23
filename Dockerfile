# ============================================================
# 口袋工具箱 PocketBox — 多阶段构建
# 阶段 1：Node 安装依赖并构建 dist
# 阶段 2：Node 仅托管静态文件
# ============================================================

# ---------- 构建阶段 ----------
FROM m.daocloud.io/docker.io/library/node:22-alpine AS build

WORKDIR /app

# 启用 corepack
RUN corepack enable \
    && corepack prepare pnpm@10.27.0 --activate

# 先复制依赖清单，利用 Docker 缓存
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build


# ---------- 运行阶段 ----------
FROM m.daocloud.io/docker.io/library/node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY --from=build /app/dist ./dist
COPY deploy/server.js ./deploy/server.js

EXPOSE 3000

CMD ["node", "deploy/server.js"]