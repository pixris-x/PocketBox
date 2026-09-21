# AGENTS.md — 项目开发规则（强制约定）

本文件是 `pocketBox` 项目的开发与维护强制约束，所有新增功能、修复、重构都必须遵守。
任何 Agent（ZCode / Claude Code 等）在为本项目编写代码前，必须先阅读并遵循本规则。

## 1. 技术栈锁定

- 前端框架：**Vite + Vue 3 + vue-router**，纯静态产物（SPA fallback 由 `deploy/server.js` 提供）。
- 后端：**.NET 10 Minimal API**（`backend/`），当前承载 IP 相关接口，约定见 §7。
- 包管理器：前端**只用 pnpm**，不得使用 npm / yarn，也不得混用；后端统一用 `dotnet` CLI。
- 语言：前端**只用 JavaScript（ESM）+ SCSS（dart-sass）**，**禁止引入 TypeScript**（不得添加 .ts/.tsx 文件或 ts 相关依赖）；后端用 C#。
- 新增第三方依赖需评估必要性，并在 `README.md` 的「依赖登记」中记录（名称 / 版本 / 用途）。
- 构建配置：`base: '/'` + History 路由（URL 无 `#`）。**部署时服务端必须配置 SPA fallback**（未知路径回退到 `index.html`），否则子路由刷新会 404。

## 2. 目录规范

```
src/
├─ common/          # ★ 公共统一目录（只放可复用代码）
│  ├─ styles/       #   公共样式：index.scss 入口 + _variables/_mixins/_base
│  ├─ utils/        #   公共函数：index.js 汇总导出
│  └─ components/   #   ★ 自研 UI 组件库，index.js 统一注册
├─ router/          # 路由（由 data/tools.js 自动生成懒加载路由）
├─ data/            # 工具元数据 tools.js（首页网格 + 分类筛选 + 路由的唯一数据源）
├─ components/      # 站点级布局组件（AppHeader/AppFooter/AppFloatingActions/
│                   #   AppUpdatePrompt/BrandLogo/ToolCard/ToolShell）
└─ views/
   ├─ Home/         # 首页（index.vue + style.scss）
   ├─ NotFound/     # 404 页（非工具页，在 router/index.js 手工注册，不进 tools.js）
   └─ tools/
      └─ <tool-id>/ # ★ 每个工具页一个独立文件夹
         ├─ index.vue      # 主 vue（合并页时是容器：UiTabs + 子面板）
         ├─ components/    # 页面私有组件
         │  └─ <Name>Panel/ # 合并页的子面板（整体搬迁，内部相对路径保持有效）
         ├─ styles/        # 页面私有样式
         └─ scripts/       # 页面私有脚本（逻辑/worker/接口调用封装）
```

```
backend/                 # ★ .NET 10 后端（只放需要服务端才能做的事）
├─ PocketBox.slnx        #   解决方案（.NET 10 的新 XML 格式，不是 .sln）
├─ data/                 #   离线数据（ip2region_v4.xdb 与随附 LICENSE）
└─ PocketBox.Api/
   ├─ Program.cs         #   组合根：只做 DI 注册与服务装配
   ├─ Endpoints/         #   端点定义（按资源分组，扩展方法挂到 IEndpointRouteBuilder）
   ├─ Services/          #   领域逻辑
   └─ Contracts/         #   请求 / 响应模型
```

```
electron/                # ★ 桌面端（Electron）外壳，仅生产构建使用
├─ main.cjs             #   主进程：app:// 协议托管 dist/ + 窗口生命周期 + electron-updater
└─ preload.cjs          #   预加载：仅暴露 window.pocketbox.desktop 标识（contextIsolation + sandbox）

scripts/                 # 构建辅助脚本（Node ESM，非站点代码）
├─ electron-dev.mjs     #   编程式起 Vite dev server + spawn Electron
└─ electron-build.mjs   #   注入 VITE_API_BASE → vite build → electron-builder
                        #   --publish 时才推 GitHub Releases（需 GH_TOKEN），见 §7.1
```

### 2.1 归属原则（重要）

- **可复用的纯算法**（base64 / base32 / md5 / sha / aes / totp / json / JSON 树 / url / HTML 实体 / 查询串 / 时间戳 / 日期 / 颜色 / diff / 文本批处理 / 空白清理 / EXIF / Cron / Unicode / Markdown(渲染) / Markdown 表格 / XML↔JSON / YAML↔JSON / ICO / PDF / curl 解析 / 命名风格 / CSV / JWT / 进制转换 / 校验和(CRC-32·Adler-32) / 校验位(Luhn·ISBN-10/13) / IP 子网 / 二维码文本分类 / 复制 / 下载 / 主题 / Service Worker 更新检测 / 桌面端环境判定等）一律进 `common/utils/`。
  站点级状态（首页筛选条件、最近使用工具等本地持久化）同样进 `common/utils/`（见 `home-state.js`），页面只负责渲染。
  ⚠ 页面按**具体模块路径**引入（`@/common/utils/totp`），不要走 `@/common/utils` 汇总入口——
  汇总会连带解析 pdf-lib / marked / js-yaml 等大依赖。
- **页面专属逻辑**（密码生成、Canvas 图片转换、terser worker 封装、页面状态编排、接口调用封装）放页面自身 `scripts/` 与 `components/`。
- **需要服务端才能做或需要联网的能力**（IP 归属地查询、访客 IP 探测）放 `backend/`；页面里的调用必须封装进 `scripts/` 模块，不要在组件中散写 `fetch`。
- **禁止复制粘贴公共函数**到页面目录；需要就用 `import` 引用。
- 页面文件夹结构约定统一（index.vue + components/ + styles/ + scripts/），某页不涉及某类时允许省略该子目录，但约定不变。

## 3. UI 规范

- 凡可用自研 UI 库组件（`UiButton` / `UiInput` / `UiTextarea` / `UiSlider` / `UiSelect` / `UiTabs` / `UiCard` / `UiSection` / `UiTag` / `UiSwitch` / `UiCheckbox` / `UiDivider` / `UiIcon` / `UiDropzone` / `UiToast` 等）的场景，**必须使用组件库**，禁止另写一套样式。
- 新 UI 组件一律放入 `src/common/components/`，并在 `index.js` 注册后使用。
- 组件样式统一使用设计 token（CSS 变量），禁止出现硬编码颜色值。
- 操作反馈统一走 `useToast`。
- **页面切换动效**统一由 `App.vue` 的 `<router-view>` + `<Transition name="page">` 提供，
  新增页面无需处理动效，但**必须保持单根元素**（多根会让 Transition 失效）。
  页面内元素的入场动效写在各自组件样式里（如 `UiCard`），全局必须保留
  `prefers-reduced-motion` 兜底（见 `common/styles/_base.scss`）。

## 4. 路由与工具注册

- 新增一个工具页只需两步：
  1. 在 `src/views/tools/<tool-id>/` 创建页面文件夹；
  2. 在 `src/data/tools.js` 添加一条元数据（id / 标题 / 描述 / 图标 / 路由 / `category` / `tags`）。
- `category` 必须取自同文件导出的 `categories`（首页分类筛选项的唯一来源，新增分类在此登记）。
- `tags` 用于卡片角标展示，同时作为首页关键词搜索的匹配字段。
- 首页网格、分类筛选与路由均由 `tools.js` 自动生成，禁止手写路由表、首页卡片或分类项。
- **合并页规矩**（2026-09-18 起）：同输入形态、低频的同类工具合并为一页，
  用 `UiTabs` 切换 `components/<Name>Panel/` 子面板，当前 Tab 同步到 URL 的 `?tab=xxx`。
  三条硬要求：
  1. 被合并的旧路径必须在 `src/router/index.js` 的 `LEGACY_REDIRECTS` 登记重定向到「新页 + 对应 Tab」，否则旧链接与收藏 404；
  2. 旧关键词要保留在新条目的 `tags` 里，否则首页搜索会漏；
  3. 单个合并页的 Tab 不超过 4 个，超过说明该拆。
     页面样式里引用公共设计 token 一律用 `@/common/styles/...` 别名（相对路径在目录层级变化时会失效）。

## 5. 命名约定

- 组件：PascalCase（`UiButton`、`StrengthMeter`）。
- 文件与目录：kebab-case（`image-convert`、`minify.worker.js`）。
- 函数 / 变量：camelCase；布尔变量用 `isXxx` / `hasXxx`。
- 常量：SCREAMING_SNAKE_CASE。
- CSS 类名：kebab-case，组件内使用 scoped 样式。

## 6. 主题

- 明暗主题必须通过 `data-theme` 属性 + CSS 变量实现（定义在 `common/styles/_base.scss`）；配色通过 `data-accent` 属性实现，两个维度正交组合（明暗 × 配色）。
- 主题状态由 `common/utils/theme.js` 统一管理（localStorage 记忆 + 跟随系统）。
- 新增配色：在 `_base.scss` 追加 `[data-theme='light'][data-accent='<id>']` 与 `[data-theme='dark'][data-accent='<id>']` 两组强调色变量，并在 `theme.js` 的 `ACCENTS` 中登记。
- **禁止在组件中硬编码颜色值**，一律引用设计 token。

## 7. 后端约定

项目已引入后端（.NET 10 Minimal API，`backend/`），用来承载「必须服务端才能做」的能力：

- **技术栈**：.NET 10 + Minimal API。**数据持久化尚未引入**，将来需要时选型为 PostgreSQL。
- **目录职责**：`Endpoints/` 只做参数绑定与响应编排，`Services/` 放领域逻辑，`Contracts/` 放请求 / 响应模型。
  `Program.cs` 只做 DI 注册与服务装配，不要把业务逻辑写进去。
- **端点命名**：统一挂在 `/api/` 下，按资源分组（如 `/api/ip`、`/api/ip/region`）。
- **配置**：路径、开关走 `appsettings.json`，但必须都有可用的默认值，保证 `dotnet run` 零配置能起来。
- **前端调用**：统一封装在对应页面的 `scripts/` 模块中，组件里不直接写 `fetch`。
  （调用点目前只有一个端点族，暂不抽 `src/api/` 层；等业务接口变多再抽。）
- **调试**：`Development` 环境启用 Swagger UI（入口 `/swagger`，文档 `/openapi/v1.json`），
  新增端点会自动出现在文档里，无需额外维护。**生产环境必须保持关闭**（`app.Environment.IsDevelopment()` 守卫），
  线上是公网服务，不对外公开接口文档。
- **部署**：`docker-compose.yml` 有 `web`（静态）、`api`（.NET）、`nginx`（统一入口）三个服务；
  nginx 把 `/api/` 整段转发给 api，静态容器不再处理任何接口。
  ⚠ **`web` / `api` 的宿主机端口必须保留 `127.0.0.1:` 前缀**（现 `8701` / `8702` 只绑回环）：
  `/api/ip` 无条件信任 `X-Real-IP` / `X-Forwarded-For`，而覆盖这两个头的是宿主机 nginx，
  把端口直接暴露到公网等于让任何人伪造来源地址。
  ⚠ **`nginx` 服务挂在 `profiles: ['local']` 下，仅用于本机验证**（`docker compose --profile local up -d`）：
  线上 nginx 由宿主机（宝塔）提供，默认的 `docker compose up -d` 必须**不**启动它，否则会白拉镜像并占用 8080。
- **三份 nginx 配置职责划分**（改分流 / 安全头 / 缓存规则前先看这张表，三份不能混用）：

  | 文件                       | 谁在用                                   | upstream 写法                       | 性质                                         |
  | -------------------------- | ---------------------------------------- | ----------------------------------- | -------------------------------------------- |
  | `deploy/nginx.bt.conf`     | **线上唯一生效**：宝塔托管的宿主机 nginx | `127.0.0.1:8701` / `127.0.0.1:8702` | 线上实配的仓库副本，纯记录，不由 Docker 挂载 |
  | `deploy/nginx.docker.conf` | compose 内的 `nginx` 容器                | 服务名 `web` / `api`                | 本机复刻生产链路，仅 `--profile local`       |
  | `deploy/nginx.conf`        | 当前未部署                               | `127.0.0.1:映射端口`                | 无面板环境手工部署的最小参考模板             |

  ⚠ **线上跑的不是 `deploy/nginx.conf`**。已踩过的坑：审计时把它当作实配，据此得出「安全头与
  来源 IP 覆盖已生效」的结论——**仓库写了不等于线上生效**，结论必须对着 `nginx.bt.conf` 复核。

- **`nginx.bt.conf` 的维护规矩**：宝塔改证书 / 改反代 / 改 TLS 协议时会重写它自己生成的段落，
  只有 `#SERVER-BLOCK START/END` 之间的内容不会被覆盖，**所有自定义一律写进该段**；
  面板侧改完配置必须回填仓库副本，两者不一致时**以线上为准并立即同步**。
  ⚠ **文件里空的 `#PHP-INFO` / `#REWRITE` / `#IP-RESTRICT` / `#BASICAUTH` / `#SUB_FILTER` /
  `#GZIP` / `#GLOBAL-CACHE` 这 7 组 START/END 锚点必须保留**——面板靠它们把功能内容
  splice 进对应槽位，删掉锚点后功能会**静默失效**。整理副本时不要顺手删空注释块（已犯过一次）。
  ⚠ **该副本不可整份覆盖回线上**：它带说明注释与 `← ` 改动标记，且强制 HTTPS / TLS 两项落在
  面板会重写的段落里。`← ` 标出的行（强制 HTTPS、去 TLSv1.1/3DES、补安全头、开 gzip）
  优先在面板 UI 落地，只在 `#SERVER-BLOCK` 段内手写自定义指令。
  SPA fallback 不在 nginx 里做，由 `deploy/server.js` 提供（见 §1）。

### 7.1 隐私口径（重要）

- 工具的**计算**在浏览器本地完成，**数据不外发给第三方**。这是站点的核心卖点，任何改动都不得削弱它。
- 当前唯一经由服务端的能力是 IP 相关接口（归属地查询、访客 IP 探测），走的是**本站自己的服务**，不经过第三方。
  因此站内文案统一为「计算在浏览器本地完成，数据不外发给第三方（IP 归属地由本站服务端查询）」。
- **桌面端（Electron）**：页面由 `app://pocketbox` 协议本地托管，24 个纯本地工具照旧零外发；
  IP 归属地仍查**同一个本站服务端**（构建时注入 `VITE_API_BASE`，后端 CORS 白名单仅 `app://pocketbox`）。
  ⚠ **桌面端唯一的第三方外发是自动更新**：打包后 `electron/main.cjs` 的 electron-updater 会向
  **GitHub**（`api.github.com` + Releases 资产域名）拉 `latest.yml` 与安装包，更新源登记在
  `package.json` 的 `build.publish`（owner `pixris-x` / repo `PocketBox`，注意仓库名大小写）。该请求只含应用版本与
  系统架构，不带任何用户内容；SW 在桌面环境仍自动跳过（Web 版继续走 SW 更新）。
  发布走 `pnpm electron:release`（需 `GH_TOKEN`），`pnpm electron:build` 只本机出包、不会误推版本。
  ⚠ **已知未解决的限制：桌面端自动更新目前对外不可用。** `pixris-x/PocketBox` 是 **private** 仓库，
  而 electron-updater 在客户端发起的是**匿名**请求 —— 私有仓库的 Releases API 与资产下载 URL 都要鉴权，
  未授权一律 404。`GH_TOKEN` 只解决「发布者上传」，解决不了「客户端拉取」。
  因此**禁止给 `build.publish` 配 token**：那等于把私有仓库的读权限打进分发的安装包交出去。
  当前状态下桌面端升级实际靠手动重装（去 Releases 页面下 exe），代码与配置齐备但对外等于没有。
  真要启用，三选一后再动 `build.publish`：① 仓库转 public；② 改 `provider: 'generic'`
  指本站 `https://pocketbox.pixris.online/desktop/`（可写在 `#SERVER-BLOCK` 安全区内，隐私口径也更干净）；
  ③ 另建一个只放 Release 资产的 public 仓库、`publish.owner/repo` 指过去。
  另外仓库从未发布过任何 Release，整条链路一次都没真跑通过。
  因为这条外发只存在于桌面端，Web 站的 4 处文案（`Home/index.vue`、`index.html`、
  `manifest.webmanifest`、`README.md` 开头）**保持原样仍然准确**；
  `AppFooter` 则按 `window.pocketbox.desktop` 标识为桌面端追加一句更新源说明，避免口径与实际行为冲突。
  **换更新源、改发布流程或给桌面端加任何新的第三方请求，都必须回头同步本节。**
- **新增任何其他外发请求或服务端能力前，必须先回头修改本节**，并同步 `Home/index.vue`、`AppFooter/index.vue`、
  `index.html`（meta description）、`public/manifest.webmanifest`、`README.md` 的隐私表述，
  避免宣传口径与实际行为冲突。

## 8. 代码风格

- 组件一律使用 `<script setup>` 组合式 API。
- 样式优先 scoped；需要跨组件共享的样式放公共样式文件。
- 不写与逻辑无关的注释；命名自解释。

## 9. 代码检查与格式

- **ESLint**（`eslint.config.js`，扁平配置）+ **Prettier**（`.prettierrc`）+ **Vitest**（`tests/`），配置文件与忽略规则已就绪。
- 常用命令：`pnpm lint`（检查）、`pnpm lint:fix`（自动修复）、`pnpm format`（格式化）、`pnpm format:check`（只检查）、`pnpm test`（跑一遍单元测试）、`pnpm test:watch`（监听模式）。
- **提交前请本地保证 `pnpm format:check`、`pnpm lint`、`pnpm test` 均为零问题**，再执行 `pnpm build` 确认可构建。项目自托管（Docker + nginx 反代），没有云端 CI，这四步就是发布前的全部门禁。
- 只有 lint + 格式 + 构建**发现不了算错**：纯函数（`common/utils/` 与页面 `scripts/` 下的算法）新增或改动时必须同步补 `tests/` 用例，尤其是边界与已知缺陷的回归哨兵。
- 规则保持克制：只做错误预防与 Vue 基础检查，风格统一交给 Prettier（无分号 / 单引号 / 100 列 / 2 空格）。
- 确需绕过某条规则时，用行内 `eslint-disable` **并写明原因**，禁止无注释地全局关闭规则。
- **后端**：`dotnet build backend/PocketBox.slnx` 编译，`dotnet run --project backend/PocketBox.Api` 本地起服务。
  提交前同样要保证**编译零警告零错误**。
- **换行**（见 `.gitattributes`）：
  - **CRLF**：`.cs` / `.csproj` / `.slnx` / `.sln` / `.props` / `.targets`
  - **LF**：其余全部，**包括 `backend/` 下的 `.json`** —— Prettier 默认 `endOfLine: lf`
    且会检查这些 JSON，写成 CRLF 会让 `pnpm format:check` 失败。后端目录混用两种约定，新增文件时注意。
