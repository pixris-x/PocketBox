# 口袋工具箱 PocketBox (pocketBox)

一个网页工具站：**Vite + Vue 3 + SCSS** 前端 + **.NET 10 Minimal API** 后端。工具计算全部在浏览器本地完成，**数据不外发给第三方**；仅 IP 归属地查询与访客 IP 探测经由本站服务端。

> ⚠️ 开发 / 维护前请先阅读 [AGENTS.md](./AGENTS.md)（项目强制开发规则）。

## 功能

| 工具                    | 说明                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| 随机强密码生成          | Web Crypto 真随机，长度 / 字符集 / 排除易混淆字符 / 批量生成            |
| 图片格式转换            | PNG / JPEG / WebP 互转，质量与缩放调节，Canvas 实现                     |
| Base64 转换             | 文本（Unicode 安全）与文件的编解码                                      |
| MD5 哈希                | 文本与文件的 MD5 摘要，附安全提示                                       |
| JavaScript 压缩         | terser 在 Web Worker 中运行，压缩 / 混淆开关，大小对比                  |
| JSON 工具               | 格式化 / 压缩 / 校验；层级树视图带类型着色、路径定位与节点复制          |
| URL 编码 / 解码         | 组件编码 / 解码，兼容查询串 `+` 号                                      |
| 时间戳转换              | 秒 / 毫秒 ↔ 日期，本地 / UTC / ISO                                      |
| UUID 生成               | 批量生成 UUID v4                                                        |
| 二维码生成              | 文本与链接转二维码，可调纠错级别并导出 PNG                              |
| 文本 diff 对比          | 逐行对比两段文本，标出新增与删除的行                                    |
| 正则测试                | 实时查看正则匹配结果、捕获分组与替换效果                                |
| 颜色格式转换            | HEX / RGB / HSL 互转，附对比度与可读性参考                              |
| 文本批处理              | 批量去空白 / 去空行 / 去重 / 排序 / 大小写转换，附字数行数统计          |
| 空白符清理              | 压缩连续空格与制表符、清理全角空格与 NBSP、删空行或合并单行             |
| EXIF 查看器             | 本地读取照片设备 / 拍摄参数 / GPS 位置，一键清除元数据导出副本          |
| Cron 表达式解析         | 拆解 5 段 Cron 字段含义并预测未来执行，支持宏与英文月 / 周名            |
| 二维码识别              | 图片中的二维码还原为文本 / 链接 / WiFi 密码，本地解码不上传             |
| URL 参数解析            | URL / 查询串拆成键值表，自动解码，支持重新编码输出                      |
| XML ↔ JSON 互转         | 属性转 @键、重复元素转数组，双向转换零依赖                              |
| HTTP 状态码 / MIME 速查 | 状态码与 Content-Type 对照表，按关键词过滤                              |
| Unicode 字符查询        | 逐码点看 UTF-8 字节 / HTML 实体 / JS 转义，支持反向还原                 |
| Markdown 表格           | CSV 转 Markdown 表格，支持对齐方式与自定义分隔符                        |
| 中文假文生成            | 生成中文占位文本用于原型与测试数据填充，Web Crypto 真随机               |
| Favicon 生成            | 一张图导出全尺寸 PNG 并打包 favicon.ico，cover 式居中裁剪               |
| PDF 合并 / 拆分         | 多个 PDF 合并或按页码区间提取页面，pdf-lib 本地处理不上传               |
| 命名风格转换            | 拆词后在 camelCase、snake_case 等 8 种命名风格间互转                    |
| 单位换算                | 长度 / 重量 / 面积 / 体积 / 数据存储 / 温度，一次列全同分类单位         |
| CSV ↔ JSON 互转         | 表格与 JSON 双向转换，支持引号转义与自定义分隔符                        |
| JWT 解析                | 本地解码 Header / Payload 与有效期，令牌不外发                          |
| SHA 哈希                | SHA-1 / 256 / 384 / 512 摘要，文本与文件均可，用于完整性校验            |
| AES 加解密              | AES-GCM 文本加解密，PBKDF2 口令派生密钥，数据与口令不出浏览器           |
| 进制转换                | 2/8/10/16 与任意 2-36 进制互转，整数走 BigInt 不丢精度                  |
| IP 工具                 | CIDR 子网计算与同子网判定（本地）；IP 归属地查询与我的公网 IP（服务端） |
| 日期计算器              | 两日期之差（年/月/日 + 总天数）与日期加减，含工作日 / 跨月跨年          |

> 首页支持按关键词搜索（匹配标题 / 描述 / id / 标签）与按分类筛选，分类定义见
> `src/data/tools.js` 导出的 `categories`。

## 技术栈

- **前端构建**：Vite 7（History 路由，部署需服务端配置 SPA fallback）
- **前端框架**：Vue 3（`<script setup>` 组合式 API）+ vue-router 4
- **前端语言**：JavaScript + SCSS（dart-sass），不使用 TypeScript
- **前端包管理**：pnpm
- **UI**：自研组件库（`src/common/components/`），SCSS 设计 token + 明暗主题
- **后端**：.NET 10 Minimal API（`backend/`），承载 IP 相关接口；暂无数据库

## 快速开始

```bash
# 前端
pnpm install     # 安装依赖
pnpm dev         # 本地开发（http://localhost:5173）
pnpm build       # 构建到 dist/
pnpm preview     # 预览构建产物
pnpm lint        # ESLint 检查（pnpm lint:fix 自动修复）
pnpm format      # Prettier 格式化（pnpm format:check 只检查）
pnpm test        # 单元测试（pnpm test:watch 监听模式）

# 后端（「IP 归属地」「我的 IP」需要它）
dotnet build backend/PocketBox.slnx          # 编译
dotnet run --project backend/PocketBox.Api   # 起服务（http://localhost:5048）
```

前后端各自启动即可联调：`vite.config.js` 的 `server.proxy` 已把 `/api` 转发到后端端口。
后端没起时，只有 IP 工具的两个联网页签会提示未检测到服务，其余工具不受影响。

## 目录结构

```
pocketBox/
├─ src/
│  ├─ common/                  # 公共统一目录
│  │  ├─ styles/               #   设计 token（明暗 × 配色两个维度）、mixins、base
│  │  ├─ utils/                #   公共函数（base64/md5/sha/aes/json/JSON 树/url/查询串/时间戳/CSV/JWT/文本处理/空白清理/EXIF/Cron/Unicode/Markdown表格/XML↔JSON/命名/进制/IP子网/日期/Service Worker 更新检测…）
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
│        └─ scripts/           #   页面脚本（terser worker、单位换算数据表、接口调用封装）
├─ backend/                    # .NET 10 后端
│  ├─ PocketBox.slnx           #   解决方案（.NET 10 的新 XML 格式）
│  ├─ data/                    #   离线数据（ip2region_v4.xdb 与随附 LICENSE）
│  └─ PocketBox.Api/
│     ├─ Program.cs            #   组合根：DI 注册与服务装配
│     ├─ Endpoints/            #   端点定义
│     ├─ Services/             #   领域逻辑
│     └─ Contracts/            #   请求 / 响应模型
├─ deploy/                     # 部署相关
│  ├─ server.js                #   容器内零依赖 Node 静态服务器（SPA fallback + ETag 协商缓存）
│  ├─ nginx.conf               #   宿主机 nginx 反代示例（upstream 用 127.0.0.1:映射端口）
│  └─ nginx.docker.conf        #   compose 内 nginx 容器用（upstream 用服务名 web / api）
├─ public/                     # 静态资产（favicon / apple-touch-icon / logo.svg /
│                              #   manifest.webmanifest / sw.js / PWA 图标）
├─ tests/                      # 单元测试（utils/ 公共纯函数、tools/ 页面私有算法）
├─ Dockerfile                  # 前端两阶段构建，运行阶段只含 dist + server.js
└─ docker-compose.yml          # web（8701:3000）+ api（8702:8080）+ nginx（8080:80，仅 local profile）
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
├─ utils/          # 公共纯函数，按模块一一对应（27 个 spec）
└─ tools/          # 页面私有算法（如单位换算的数据表 scripts/units.js）
```

只测纯函数，用 `node` 环境（不引入 jsdom）。UI 交互与视觉仍需人工验证。
新增或修改纯函数时同步补用例，重点是**边界值**与**已知缺陷的回归哨兵**——
`lint` / `format:check` / `build` 都发现不了「算错了」。

后端目前没有测试工程：`IpRegionService.Normalize`（输入规整与 IPv6 拦截）是其中唯一有分支的纯逻辑，
将来补 `xunit` 时应优先覆盖它与段边界的回归。

## 主题

主题分两个正交维度，都由 `common/utils/theme.js` 管理（localStorage 记忆；明暗默认跟随系统）：

| 维度 | 属性                | 取值                                               |
| ---- | ------------------- | -------------------------------------------------- |
| 明暗 | `html[data-theme]`  | `light` / `dark`                                   |
| 配色 | `html[data-accent]` | `orange` 橙灰（默认）/ `blue` 经典蓝 / `teal` 青绿 |

切换入口在顶栏右侧（配色下拉 + 明暗按钮）。中性色统一走中性灰，强调色随配色变化；成功 / 警告 / 危险等语义色不随配色变化。组件与页面样式一律使用设计 token（`var(--color-*)`），禁止硬编码颜色。

新增配色：在 `_base.scss` 追加 `[data-theme='light'][data-accent='<id>']` 与 `[data-theme='dark'][data-accent='<id>']` 两组变量，并在 `theme.js` 的 `ACCENTS` 中登记即可。

## 后端（.NET 10 Minimal API）

`backend/` 承载「必须服务端才能做」的能力，目前是 IP 相关接口：

| 端点                 | 说明                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `GET /api/ip`        | 回报访问者自己的公网 IP                                            |
| `GET /api/ip/region` | 查归属地；省略 `ip` 参数即查访问者自己（一次同时拿到 IP 与归属地） |

**本地调试用 Swagger UI**：仅在 `Development` 环境可用，入口 `/swagger`；文档由内置的
`Microsoft.AspNetCore.OpenApi` 生成在 `/openapi/v1.json`，UI 由 Swashbuckle 提供。
VS 与 `dotnet run` 默认就是开发环境，`launchSettings.json` 已把启动页指向 `swagger`。
**生产环境不注册这两个路由**（由 `app.Environment.IsDevelopment()` 守卫），线上访问返回 404 ——
公网服务不该对外公开接口文档。

**不想装 UI 也能调**：项目内置 `PocketBox.Api.http`，VS 2022 17.8+ 直接打开它，
点请求上方的「Send Request」即可发请求看响应（需先启动项目）。纯文本、可入库、可团队共享，
是比 Swagger UI 更轻的调试方式。

- **归属地数据**：`backend/data/ip2region_v4.xdb`（约 11MB，Apache-2.0 / MIT）启动时一次性载入内存
  （`CachePolicy.Content`，官方 benchmark 约 53ns/次，比 `VectorIndex` 快约 80 倍）。
- **访客地址**：读反向代理写入的 `X-Real-IP` / `X-Forwarded-For`（见 `deploy/nginx.conf`），
  直连时回落连接地址，并把 `::ffff:1.2.3.4` 这类 IPv6-mapped 形式还原成 IPv4。
  这两个头可被伪造，因此 **API 端口只映射到宿主机给 nginx 用，不要直接暴露到公网**。
- **不写日志、不做持久化**，响应带 `Cache-Control: no-store`。
- **数据持久化尚未引入**：工具功能都不需要存储，将来真有需求时按 `AGENTS.md` §7 选型 PostgreSQL。

## PWA / 离线

站点已支持**安装到桌面 / 手机主屏**并**离线使用**（IP 归属地查询需要联网，离线时该页签不可用）：

- `public/manifest.webmanifest`：应用名称、图标（192 / 512 / maskable）、独立窗口启动
- `public/sw.js`：手写 Service Worker（无第三方依赖），缓存策略为
  - 导航请求：网络优先，离线回退 `/index.html`（前端路由接着渲染对应页面或 404 页）
  - `/assets/`（文件名带 hash）：缓存优先，可长期复用
  - 其他同源资源：Stale-While-Revalidate
  - `/api/`：**完全不交给 SW** —— API 响应一旦被缓存，就会持续返回过期的出口 IP
- 注册逻辑在 `src/common/utils/sw.js`（由 `src/main.js` 调用），**仅生产构建注册**（`import.meta.env.PROD`），不干扰开发环境 HMR
- 更新检测：`sw.js` 的 install 阶段是无条件 `skipWaiting()`、activate 阶段 `clients.claim()`，新版本会立即接管。因此页面侧**不能用 `registration.waiting` 判断是否有新版本**（正常更新路径下它恒为 `null`），而是监听 `controllerchange`，随后由 `AppUpdatePrompt` 提示「已更新到新版本」，由用户决定何时刷新（首次安装不误报）。

**版本号无需手工维护**：`public/sw.js` 顶部的 `VERSION` 是占位符 `__SW_VERSION__`，构建时由
`vite.config.js` 的 `pocketbox-sw-version` 插件替换为「`package.json` 版本 + dist 产物内容指纹」
（形如 `0.2.0-41f6d3a8`）。产物一有变化指纹就变，缓存名随之改变，旧缓存必然被 `activate` 清理，
不会出现用户长期停留在旧版本的情况。若同码重复构建，指纹保持不变（可复现）。

发布新版本时只需升 `package.json` 的 `version`（便于与 git tag 对应），无需再动 `sw.js`。

> 离线能力需通过 HTTP(S) 访问；Service Worker 仅在 `https` 或 `localhost` 下注册。

## 部署

本项目采用**自托管**方式：在同一台机器上用 Docker 跑静态容器与 API 容器，由宿主机 nginx 反向代理对外服务。

```
浏览器 → 宿主机 nginx（80/443，gzip + 安全头 + HTTPS）
           ├─ /api/     → proxy_pass 127.0.0.1:8702 → API 容器（.NET，IP 归属地 / 访客 IP）
           └─ 其余路径  → proxy_pass 127.0.0.1:8701 → 静态容器（Node，dist/ + SPA fallback）
```

### 本机验证（compose 内置 nginx，宿主机无需装 nginx）

`docker-compose.yml` 里的 `nginx` 服务就是为这个场景准备的：它和 `web`、`api` 在同一个 compose 网络内，
把 `/api/` 转给 api 服务、其余转给静态服务，完整复刻生产链路。

它挂在 **`local` profile** 下，所以默认的 `docker compose up -d` 不会启动它，必须显式带上 profile：

```bash
docker compose --profile local up -d --build
# 然后打开 http://localhost:8080/ ，就是完整站点（含 IP 归属地）
```

- **线上不需要它** —— 线上已有宿主机 nginx 负责 TLS 与 `/api/` 分流，再起一个容器版只会白拉镜像、
  白占 8080。所以给它加了 `profiles: ['local']`，线上直接 `docker compose up -d` 时会自动跳过。
- 入口用 **8080** 而不是 80：宿主机 80 常被 Windows 的 HTTP.sys 占用。改 `docker-compose.yml` 里
  `'8080:80'` 左侧数字即可换端口。
- 它挂载的是 **`deploy/nginx.docker.conf`** —— upstream 写的是 compose 服务名（`web` / `api`）；
  而给宿主机 nginx 用的 `deploy/nginx.conf` 写的是 `127.0.0.1:映射端口`。**这两份配置不能混用。**
- 本机访问时「我的 IP」会显示容器网关地址（形如 `172.18.0.1`）而不是真实公网 IP —— 本机环境拿不到
  自己的公网出口地址，属正常现象；线上经真实 nginx 反代时会正确显示访客地址。

### 步骤

```bash
docker compose up -d --build   # 构建并后台启动 web + api（nginx 属 local profile，不会被启动）
docker compose logs -f         # 查看日志（加服务名可只看一个：logs -f api）
docker compose down            # 停止并移除容器
```

1. `web` 映射到宿主机 **8701**、`api` 映射到 **8702**（改 `docker-compose.yml` 里 `ports` 左侧数字即可换端口）；
2. 把 `deploy/nginx.conf` 放进宿主机 nginx（改 `server_name` 与两个 `proxy_pass` 端口），`nginx -s reload`；
3. HTTPS 建议 `certbot --nginx -d your.domain.com` 一键生成。

宿主机无需安装 Node 或 .NET SDK —— 前端构建与后端发布都在容器构建阶段完成。

> `deploy/server.js` 的 SPA fallback 是 History 路由的命脉：无扩展名的未知路径回退 `index.html` 交给前端路由渲染 404 页，带扩展名的真实 404。
>
> 它另有一处与性能相关的约定：非 `/assets/` 的响应走 `no-cache` + `ETag` 协商缓存，
> 让图标 / manifest 这类不带内容 hash 的文件重复访问时只交换一个 304。

> 若将来在 nginx 前再挂 CDN，`X-Real-IP` 会变成 CDN 节点地址、「我的 IP」随之显示错误结果，
> 需要在宿主机启用 `ngx_http_realip_module`（`set_real_ip_from <CDN 回源段>;` +
> `real_ip_header X-Forwarded-For;`）才能还原真实客户端地址。

<details>
<summary>接入已有的 nginx（含宝塔面板）：<code>location /api/</code> 怎么加</summary>

`deploy/nginx.conf` 是**独立示例**；真实环境往往已经有自己的站点配置（证书路径、其他站点、面板模板）。
此时**不要整份替换**，只补下面这一段分流即可，其余保持不动：

```nginx
# 加进现有 server 块。若 80 与 443 写在同一个 server 块里，只需加一次
location ^~ /api/ {
    proxy_pass http://127.0.0.1:8702;        # ⚠ 末尾不要加斜杠，否则 /api 前缀会被吃掉

    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**原有 `location ^~ /`（指向前端 8701）无需调整位置。** nginx 的匹配规则是「**最长 `^~` 前缀优先**」：
`/api/ip` 同时匹配 `/api/` 与 `/`，而 `/api/` 更长，所以它胜出 —— 与两个块谁写在前面无关。

**宝塔面板**：走「配置文件 → 自定义配置文件 → 选择配置块 `server块`」，把上面这段粘进去后保存并重载。
面板会把它写进 `/www/server/panel/vhost/nginx/extension/<域名>/`，再由主配置里的 `include` 引入；
好处是面板重新生成主配置时不会把它冲掉，比直接改主配置文件更稳。

验证（两条都该返回 JSON，而不是 HTML）：

```bash
curl -i https://<域名>/api/ip
curl -i 'https://<域名>/api/ip/region?ip=114.114.114.114'
```

</details>

<details>
<summary>环境没有 compose 插件？用等价的 <code>docker run</code></summary>

```bash
# 静态容器
docker build -t pocketbox:latest .
docker run -d --name pocketbox --restart unless-stopped -p 8701:3000 pocketbox:latest

# API 容器（构建上下文是 backend/）
docker build -t pocketbox-api:latest ./backend
docker run -d --name pocketbox-api --restart unless-stopped -p 8702:8080 pocketbox-api:latest

docker logs -f pocketbox        # 查看日志
docker rm -f pocketbox          # 停止并移除
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

以上任一方式都只有前端，IP 归属地与「我的 IP」需要另外自行部署 `backend/`。
</details>

> 注意：History 路由 + 绝对 base 意味着**不能用 `file://` 直接打开** `dist/index.html`，必须经由 HTTP 服务器。JavaScript 压缩工具使用 Web Worker，同样需要 HTTP 环境。开发时 `pnpm dev` 自带 fallback，无需额外配置。

## 桌面端（Electron）

Electron 封装是可选分发渠道，Web 版构建与部署完全不受影响：

```bash
pnpm install        # electron 相关依赖已登记在 devDependencies
pnpm electron:dev   # 开发：Vite dev server + Electron，IP 接口走 vite proxy（需本地后端 5048）
pnpm electron:build # 打包：注入 VITE_API_BASE → vite build → electron-builder，Windows 安装包输出到 release/
```

- **加载方式**：生产模式由主进程注册 `app://pocketbox` 自定义协议托管 `dist/`，History 路由无需改成 hash 模式
- **IP 归属地**：复用线上 API（后端 CORS 白名单仅 `app://pocketbox`），数据口径与 Web 端一致；23 个纯本地工具零改动
- **Service Worker**：桌面环境自动跳过（`electron/preload.cjs` 暴露标识），版本更新将来走 electron-updater
- 未做代码签名时 Windows SmartScreen 会告警，属正常现象

## 依赖登记

### 前端依赖（npm）

| 包                 | 版本   | 用途                                                          |
| ------------------ | ------ | ------------------------------------------------------------- |
| vue                | ^3.5   | 框架                                                          |
| vue-router         | ^4.5   | 路由                                                          |
| js-md5             | ^0.8   | MD5 摘要                                                      |
| qrcode-generator   | ^2.0   | 二维码矩阵计算（纯计算、无子依赖；Canvas 渲染与导出自行实现） |
| jsqr               | ^1.4   | 二维码识别（纯解码库，从图片像素解出文本，本地运行）          |
| pdf-lib            | ^1.17  | PDF 合并 / 拆分（纯 JS 读写，本地运行，不依赖服务端）         |
| terser             | ^5.36  | JavaScript 压缩（Vite `?worker` 打包，Worker 中运行）         |
| vite               | ^7     | 构建                                                          |
| @vitejs/plugin-vue | ^6     | Vue SFC 编译                                                  |
| sass               | ^1.80  | SCSS 编译                                                     |
| electron           | ^44.4  | 桌面端运行时（devDependencies，仅 Electron 构建用）           |
| electron-builder   | ^26.15 | 桌面端打包（devDependencies，仅 Electron 构建用）             |

### 后端依赖（NuGet）

| 包                               | 版本    | 用途                                                                           |
| -------------------------------- | ------- | ------------------------------------------------------------------------------ |
| IP2Region.Net                    | 3.0.2   | 加载 ip2region xdb 做内存二分查找（Apache-2.0），官方 C# binding，支持 net10.0 |
| Microsoft.AspNetCore.OpenApi     | 10.0.12 | 生成 OpenAPI 文档（`/openapi/v1.json`），随 .NET 10 同步发布                   |
| Swashbuckle.AspNetCore.SwaggerUI | 10.2.3  | Swagger UI 静态资源，仅开发环境挂载                                            |

### 非 npm 依赖

| 名称      | 版本    | 用途                                                                                                             |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| ip2region | v4 数据 | 离线 IP 归属地库（Apache-2.0 / MIT 双许可），置于 `backend/data/`（含 LICENSE），随 API 镜像分发，不参与前端构建 |

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
