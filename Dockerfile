# ============================================================
# 口袋工具箱 PocketBox — 多阶段构建
# 阶段 1：node 安装依赖并构建 dist/
# 阶段 2：nginx 仅托管构建产物（镜像小、无 node 运行时）
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
FROM nginx:alpine

# 构建产物放到 nginx 默认静态目录
COPY --from=build /app/dist /usr/share/nginx/html

# 自定义站点配置（含 History 路由 fallback）
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
