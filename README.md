# 口袋工具箱 PocketBox (webTool)

一个纯前端的网页工具站：**Vite + Vue 3 + SCSS**，所有工具都在浏览器本地运行，**数据不会上传到任何服务器**（隐私友好）。

> ⚠️ 开发 / 维护前请先阅读 [AGENTS.md](./AGENTS.md)（项目强制开发规则）。

## 功能

| 工具 | 说明 |
| --- | --- |
| 随机强密码生成 | Web Crypto 真随机，长度 / 字符集 / 排除易混淆字符 / 批量生成 |
| 图片格式转换 | PNG / JPEG / WebP 互转，质量与缩放调节，Canvas 实现 |
| Base64 转换 | 文本（Unicode 安全）与文件的编解码 |
| MD5 哈希 | 文本与文件的 MD5 摘要，附安全提示 |
| JavaScript 压缩 | terser 在 Web Worker 中运行，压缩 / 混淆开关，大小对比 |
| JSON 格式化 | 格式化 / 压缩 / 校验，可选排序键 |
| URL 编码 / 解码 | 组件编码 / 解码，兼容查询串 `+` 号 |
| 时间戳转换 | 秒 / 毫秒 ↔ 日期，本地 / UTC / ISO |
| UUID 生成 | 批量生成 UUID v4 |

## 技术栈

- **构建**：Vite 7（History 路由，部署需服务端配置 SPA fallback）
- **框架**：Vue 3（`<script setup>` 组合式 API）+ vue-router 4
- **语言**：JavaScript + SCSS（dart-sass），不使用 TypeScript
- **包管理**：pnpm
- **UI**：自研组件库（`src/common/components/`），SCSS 设计 token + 明暗主题

## 快速开始

```bash
pnpm install     # 安装依赖
pnpm dev         # 本地开发（http://localhost:5173）
pnpm build       # 构建到 dist/
pnpm preview     # 预览构建产物
```

## 目录结构

```
src/
├─ common/                  # 公共统一目录
│  ├─ styles/               #   设计 token（明暗主题变量）、mixins、base
│  ├─ utils/                #   公共函数（base64/md5/json/url/时间戳/复制/下载/主题…）
│  └─ components/           #   自研 UI 组件库（UiButton/UiInput/UiSlider/…）
├─ router/                  # 路由（由 data/tools.js 自动生成）
├─ data/tools.js            # 工具元数据（首页网格 + 路由的唯一数据源）
├─ components/              # 站点级布局组件（AppHeader/AppFooter/ToolCard/ToolShell）
└─ views/
   ├─ Home/                 # 首页
   └─ tools/<tool-id>/      # 每个工具页独立文件夹
      ├─ index.vue          #   主 vue
      ├─ components/        #   页面私有组件
      ├─ styles/            #   页面样式
      └─ scripts/           #   页面脚本（如 terser worker）
```

## 新增一个工具

1. 在 `src/views/tools/<tool-id>/` 创建页面文件夹（index.vue + components/ + styles/ + scripts/）；
2. 在 `src/data/tools.js` 添加一条元数据（id / 标题 / 描述 / 图标 / 路由）。
   首页网格与路由自动生成，无需改动其他文件。

## 主题

主题分两个正交维度，都由 `common/utils/theme.js` 管理（localStorage 记忆；明暗默认跟随系统）：

| 维度 | 属性 | 取值 |
| --- | --- | --- |
| 明暗 | `html[data-theme]` | `light` / `dark` |
| 配色 | `html[data-accent]` | `orange` 橙灰（默认）/ `blue` 经典蓝 / `teal` 青绿 |

切换入口在顶栏右侧（配色下拉 + 明暗按钮）。中性色统一走中性灰，强调色随配色变化；成功 / 警告 / 危险等语义色不随配色变化。组件与页面样式一律使用设计 token（`var(--color-*)`），禁止硬编码颜色。

新增配色：在 `_base.scss` 追加 `[data-theme='light'][data-accent='<id>']` 与 `[data-theme='dark'][data-accent='<id>']` 两组变量，并在 `theme.js` 的 `ACCENTS` 中登记即可。

## 部署

`pnpm build` 产出 `dist/`。项目使用 **History 路由**（URL 无 `#`），服务端必须把未知路径回退到 `index.html`，否则在 `/tool/password` 这类子路由刷新会 404：

- **Netlify**：`dist/_redirects` 写入 `/* /index.html 200`
- **Vercel**：`vercel.json` 配置 `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **Nginx**（直接托管静态文件，或作为反向代理后端的静态容器，配置相同）：

  ```nginx
  server {
      listen 80;
      server_name your.domain;
      root /var/www/webtool;   # dist/ 的内容
      index index.html;

      # 带 hash 的构建产物可长期缓存
      location /assets/ {
          expires 1y;
          add_header Cache-Control "public, immutable";
      }

      # History 路由关键：未知路径回退到 index.html，由前端路由渲染 404 页
      location / {
          try_files $uri $uri/ /index.html;
      }
  }
  ```

- **Docker + 宿主机 Nginx 反代（推荐）**：容器内完成 `pnpm install` + `pnpm build`，用零依赖的 Node 静态服务器（`deploy/server.js`）托管 `dist/` 并自带 SPA fallback；**容器里没有 nginx**，gzip / 安全头 / HTTPS 全部由宿主机 nginx 反向代理层负责。宿主机无需安装 Node。

  ```bash
  docker compose up -d --build   # 构建并后台启动
  docker compose logs -f         # 查看日志
  docker compose down            # 停止并移除容器
  ```

  默认映射到宿主机 **8701** 端口，改 `docker-compose.yml` 中 `ports` 左侧数字即可换端口。然后把 `deploy/nginx.conf` 放进宿主机 nginx（改 `server_name` 与 `proxy_pass` 端口），reload 即可；HTTPS 建议 `certbot --nginx -d your.domain.com` 自动生成。

  > `deploy/server.js` 的 SPA fallback 是 History 路由的命脉：无扩展名的未知路径回退 `index.html` 交给前端路由渲染 404 页，带扩展名的真实 404。若改用宿主机 nginx 直接托管 `dist/`（不经容器），则改用上文静态托管的 `try_files` 配置。
- **GitHub Pages**：放一份与 `index.html` 内容相同的 `404.html`

> 注意：History 路由 + 绝对 base 意味着**不能用 `file://` 直接打开** `dist/index.html`，必须经由 HTTP 服务器。JavaScript 压缩工具使用 Web Worker，同样需要 HTTP 环境。开发时 `pnpm dev` 自带 fallback，无需额外配置。

## 未来后端（.NET 10 + PostgreSQL）

v1 为纯前端、无任何请求外发。如需后端 / 数据持久化（例如保存工具历史、用户配置、云端文件处理），扩展方式：

1. 新增 `src/api/` 服务层，通过 fetch 调用后端接口，前端目录结构不变；
2. 后端采用 .NET 10 Minimal API + PostgreSQL；
3. 工具核心逻辑均为纯函数（`common/utils/`），可平滑迁移或复用。

## 依赖登记

| 包 | 版本 | 用途 |
| --- | --- | --- |
| vue | ^3.5 | 框架 |
| vue-router | ^4.5 | 路由 |
| js-md5 | ^0.8 | MD5 摘要 |
| terser | ^5.36 | JavaScript 压缩（Vite `?worker` 打包，Worker 中运行） |
| vite | ^7 | 构建 |
| @vitejs/plugin-vue | ^6 | Vue SFC 编译 |
| sass | ^1.80 | SCSS 编译 |

## 许可

MIT
