# 口袋工具箱 PocketBox (pocketBox)

一个纯前端的网页工具站：**Vite + Vue 3 + SCSS**，所有工具都在浏览器本地运行，**数据不会上传到任何服务器**（隐私友好）。

> ⚠️ 开发 / 维护前请先阅读 [AGENTS.md](./AGENTS.md)（项目强制开发规则）。

## 功能

| 工具            | 说明                                                            |
| --------------- | --------------------------------------------------------------- |
| 随机强密码生成  | Web Crypto 真随机，长度 / 字符集 / 排除易混淆字符 / 批量生成    |
| 图片格式转换    | PNG / JPEG / WebP 互转，质量与缩放调节，Canvas 实现             |
| Base64 转换     | 文本（Unicode 安全）与文件的编解码                              |
| MD5 哈希        | 文本与文件的 MD5 摘要，附安全提示                               |
| JavaScript 压缩 | terser 在 Web Worker 中运行，压缩 / 混淆开关，大小对比          |
| JSON 格式化     | 格式化 / 压缩 / 校验，可选排序键                                |
| URL 编码 / 解码 | 组件编码 / 解码，兼容查询串 `+` 号                              |
| 时间戳转换      | 秒 / 毫秒 ↔ 日期，本地 / UTC / ISO                              |
| UUID 生成       | 批量生成 UUID v4                                                |
| 二维码生成      | 文本与链接转二维码，可调纠错级别并导出 PNG                      |
| 文本 diff 对比  | 逐行对比两段文本，标出新增与删除的行                            |
| 正则测试        | 实时查看正则匹配结果、捕获分组与替换效果                        |
| 颜色格式转换    | HEX / RGB / HSL 互转，附对比度与可读性参考                      |
| 文本批处理      | 批量去空白 / 去空行 / 去重 / 排序 / 大小写转换，附字数行数统计  |
| 命名风格转换    | 拆词后在 camelCase、snake_case 等 8 种命名风格间互转            |
| 单位换算        | 长度 / 重量 / 面积 / 体积 / 数据存储 / 温度，一次列全同分类单位 |
| CSV ↔ JSON 互转 | 表格与 JSON 双向转换，支持引号转义与自定义分隔符                |
| JWT 解析        | 本地解码 Header / Payload 与有效期，令牌不外发                  |

> 首页支持按关键词搜索（匹配标题 / 描述 / id / 标签）与按分类筛选，分类定义见
> `src/data/tools.js` 导出的 `categories`。

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
pnpm lint        # ESLint 检查（pnpm lint:fix 自动修复）
pnpm format      # Prettier 格式化（pnpm format:check 只检查）
pnpm test        # 单元测试（pnpm test:watch 监听模式）
```

## 目录结构

```
pocketBox/
├─ src/
│  ├─ common/                  # 公共统一目录
│  │  ├─ styles/               #   设计 token（明暗 × 配色两个维度）、mixins、base
│  │  ├─ utils/                #   公共函数（base64/md5/json/url/时间戳/CSV/JWT/文本处理…）
│  │  └─ components/           #   自研 UI 组件库（UiButton/UiInput/UiSlider/…）
│  ├─ router/                  # 路由（由 data/tools.js 自动生成）
│  ├─ data/tools.js            # 工具元数据（首页网格 + 分类筛选 + 路由的唯一数据源）
│  ├─ components/              # 站点级布局组件（AppHeader/AppFooter/AppFloatingActions/
│  │                           #   AppUpdatePrompt/BrandLogo/ToolCard/ToolShell）
│  └─ views/
│     ├─ Home/                 # 首页（hero + 搜索 / 分类筛选 + 工具卡片网格）
│     ├─ NotFound/             # 404 页（catch-all 路由渲染，非工具页，不进 tools.js）
│     └─ tools/<tool-id>/      # 每个工具页独立文件夹
│        ├─ index.vue          #   主 vue
│        ├─ components/        #   页面私有组件
│        ├─ styles/            #   页面样式
│        └─ scripts/           #   页面脚本（如 terser worker、单位换算数据表）
├─ deploy/                     # 部署相关
│  ├─ server.js                #   容器内零依赖 Node 静态服务器（含 SPA fallback）
│  └─ nginx.conf               #   宿主机 nginx 反向代理配置示例
├─ public/                     # 静态资产（favicon / apple-touch-icon / logo.svg /
│                              #   manifest.webmanifest / sw.js / PWA 图标）
├─ tests/                      # 单元测试（utils/ 公共纯函数、tools/ 页面私有算法）
├─ Dockerfile                  # 两阶段构建，运行阶段只含 dist + server.js
└─ docker-compose.yml          # 映射 8701:3000
```

## 新增一个工具

1. 在 `src/views/tools/<tool-id>/` 创建页面文件夹（index.vue + components/ + styles/ + scripts/）；
2. 在 `src/data/tools.js` 添加一条元数据（id / 标题 / 描述 / 图标 / 路由 / `category` / `tags`）。
   首页网格、分类筛选与路由自动生成，无需改动其他文件。
   `category` 必须取自同文件导出的 `categories`；`tags` 同时用于卡片角标与首页搜索匹配。

## 测试

`tests/` 下用 Vitest 覆盖纯函数，跑 `pnpm test` 即可；共用 `vite.config.js` 里的别名与插件解析，
因此可以直接 `import { xxx } from '@/common/utils/text'`，无需额外配置。

```
tests/
├─ utils/          # 公共纯函数，按模块一一对应
└─ tools/          # 页面私有算法（如单位换算的数据表 scripts/units.js）
```

只测纯函数，用 `node` 环境（不引入 jsdom）。UI 交互与视觉仍需人工验证。
新增或修改纯函数时同步补用例，重点是**边界值**与**已知缺陷的回归哨兵**——
`lint` / `format:check` / `build` 都发现不了「算错了」。

## 主题

主题分两个正交维度，都由 `common/utils/theme.js` 管理（localStorage 记忆；明暗默认跟随系统）：

| 维度 | 属性                | 取值                                               |
| ---- | ------------------- | -------------------------------------------------- |
| 明暗 | `html[data-theme]`  | `light` / `dark`                                   |
| 配色 | `html[data-accent]` | `orange` 橙灰（默认）/ `blue` 经典蓝 / `teal` 青绿 |

切换入口在顶栏右侧（配色下拉 + 明暗按钮）。中性色统一走中性灰，强调色随配色变化；成功 / 警告 / 危险等语义色不随配色变化。组件与页面样式一律使用设计 token（`var(--color-*)`），禁止硬编码颜色。

新增配色：在 `_base.scss` 追加 `[data-theme='light'][data-accent='<id>']` 与 `[data-theme='dark'][data-accent='<id>']` 两组变量，并在 `theme.js` 的 `ACCENTS` 中登记即可。

## PWA / 离线

站点已支持**安装到桌面 / 手机主屏**并**离线使用**：

- `public/manifest.webmanifest`：应用名称、图标（192 / 512 / maskable）、独立窗口启动
- `public/sw.js`：手写 Service Worker（无第三方依赖），缓存策略为
  - 导航请求：网络优先，离线回退 `/index.html`（前端路由接着渲染对应页面或 404 页）
  - `/assets/`（文件名带 hash）：缓存优先，可长期复用
  - 其他同源资源：Stale-While-Revalidate
- 注册逻辑在 `src/common/utils/sw.js`（由 `src/main.js` 调用），**仅生产构建注册**（`import.meta.env.PROD`），不干扰开发环境 HMR
- 更新检测：`sw.js` 的 install 阶段是无条件 `skipWaiting()`、activate 阶段 `clients.claim()`，新版本会立即接管。因此页面侧**不能用 `registration.waiting` 判断是否有新版本**（正常更新路径下它恒为 `null`），而是监听 `controllerchange`，随后由 `AppUpdatePrompt` 提示「已更新到新版本」，由用户决定何时刷新（首次安装不误报）。

**版本号无需手工维护**：`public/sw.js` 顶部的 `VERSION` 是占位符 `__SW_VERSION__`，构建时由
`vite.config.js` 的 `pocketbox-sw-version` 插件替换为「`package.json` 版本 + dist 产物内容指纹」
（形如 `0.2.0-41f6d3a8`）。产物一有变化指纹就变，缓存名随之改变，旧缓存必然被 `activate` 清理，
不会出现用户长期停留在旧版本的情况。若同码重复构建，指纹保持不变（可复现）。

发布新版本时只需升 `package.json` 的 `version`（便于与 git tag 对应），无需再动 `sw.js`。

> 离线能力需通过 HTTP(S) 访问；Service Worker 仅在 `https` 或 `localhost` 下注册。

## 部署

本项目采用**自托管**方式：在开发机上用 Docker 跑静态容器，由宿主机 nginx 反向代理对外服务。

```
浏览器 → 宿主机 nginx（80/443，gzip + 安全头 + HTTPS）
           ↓ proxy_pass 127.0.0.1:8701
         容器内 Node 静态服务器（deploy/server.js，托管 dist/ + SPA fallback）
```

### 步骤

```bash
docker compose up -d --build   # 构建并后台启动
docker compose logs -f         # 查看日志
docker compose down            # 停止并移除容器
```

1. 容器映射到宿主机 **8701** 端口（改 `docker-compose.yml` 里 `ports` 左侧数字即可换端口）；
2. 把 `deploy/nginx.conf` 放进宿主机 nginx（改 `server_name` 与 `proxy_pass` 端口），`nginx -s reload`；
3. HTTPS 建议 `certbot --nginx -d your.domain.com` 一键生成。

宿主机无需安装 Node —— `pnpm install` 与 `pnpm build` 都在容器构建阶段完成。

> `deploy/server.js` 的 SPA fallback 是 History 路由的命脉：无扩展名的未知路径回退 `index.html` 交给前端路由渲染 404 页，带扩展名的真实 404。

<details>
<summary>环境没有 compose 插件？用等价的 <code>docker run</code></summary>

```bash
docker build -t pocketbox:latest .
docker run -d --name pocketbox --restart unless-stopped -p 8701:3000 pocketbox:latest
docker logs -f pocketbox    # 查看日志
docker rm -f pocketbox      # 停止并移除
```

（部分 Docker Desktop 版本未装 compose 插件，此时 `docker compose` 不是有效子命令。）
</details>

<details>
<summary>其他部署平台（备选，当前未使用）</summary>

项目使用 **History 路由**（URL 无 `#`），任何平台都必须把未知路径回退到 `index.html`，否则在 `/tool/password` 这类子路由刷新会 404：

- **Netlify**：`dist/_redirects` 写入 `/* /index.html 200`
- **Vercel**：`vercel.json` 配置 `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- **nginx 直接托管静态文件**（不经容器，把 `dist/` 拷到服务器，用 `try_files` 回退）：

  ```nginx
  server {
      listen 80;
      server_name your.domain;
      root /var/www/pocketbox;   # dist/ 的内容
      index index.html;

      location /assets/ {
          expires 1y;
          add_header Cache-Control "public, immutable";
      }

      location / {
          try_files $uri $uri/ /index.html;
      }
  }
  ```

- **GitHub Pages**：放一份与 `index.html` 内容相同的 `404.html`

</details>

> 注意：History 路由 + 绝对 base 意味着**不能用 `file://` 直接打开** `dist/index.html`，必须经由 HTTP 服务器。JavaScript 压缩工具使用 Web Worker，同样需要 HTTP 环境。开发时 `pnpm dev` 自带 fallback，无需额外配置。

## 未来后端（.NET 10 + PostgreSQL）

v1 为纯前端、无任何请求外发。如需后端 / 数据持久化（例如保存工具历史、用户配置、云端文件处理），扩展方式：

1. 新增 `src/api/` 服务层，通过 fetch 调用后端接口，前端目录结构不变；
2. 后端采用 .NET 10 Minimal API + PostgreSQL；
3. 工具核心逻辑均为纯函数（`common/utils/`），可平滑迁移或复用。

## 依赖登记

| 包                 | 版本  | 用途                                                          |
| ------------------ | ----- | ------------------------------------------------------------- |
| vue                | ^3.5  | 框架                                                          |
| vue-router         | ^4.5  | 路由                                                          |
| js-md5             | ^0.8  | MD5 摘要                                                      |
| qrcode-generator   | ^2.0  | 二维码矩阵计算（纯计算、无子依赖；Canvas 渲染与导出自行实现） |
| terser             | ^5.36 | JavaScript 压缩（Vite `?worker` 打包，Worker 中运行）         |
| vite               | ^7    | 构建                                                          |
| @vitejs/plugin-vue | ^6    | Vue SFC 编译                                                  |
| sass               | ^1.80 | SCSS 编译                                                     |

### 开发依赖

| 包                | 版本 | 用途                                    |
| ----------------- | ---- | --------------------------------------- |
| eslint            | ^10  | 代码检查（扁平配置 `eslint.config.js`） |
| @eslint/js        | ^10  | ESLint 官方推荐规则集                   |
| eslint-plugin-vue | ^10  | Vue 单文件组件检查                      |
| globals           | ^17  | 环境全局变量（browser / node / worker） |
| prettier          | ^3   | 代码格式化（`.prettierrc`）             |
| vitest            | ^5   | 单元测试（`tests/`，纯函数断言）        |

## 许可

MIT
