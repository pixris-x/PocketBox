# ============================================================
# 口袋工具箱 PocketBox — 多阶段构建
# 阶段 1：node 安装依赖并构建 dist/
# 阶段 2：node 仅托管静态文件（deploy/server.js，零依赖）
# nginx 由宿主机负责，容器只做静态托管，通过反代对外服务
# ============================================================

# ---------- 构建阶段 ----------
FROM node:22-alpine AS build

WORKDIR /app

# 启用 corepack 以使用 package.json 中声明的 pnpm 版本
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# 先只复制依赖清单，充分利用 Docker 层缓存
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---------- 运行阶段 ----------
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# 只拷贝构建产物与服务器脚本，不带入 node_modules / 源码
COPY --from=build /app/dist ./dist
COPY deploy/server.js ./deploy/server.js

EXPOSE 3000

CMD ["node", "deploy/server.js"]
