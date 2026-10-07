# 口袋工具箱 PocketBox (pocketBox)

一个网页工具站：**Vite + Vue 3 + SCSS** 前端 + **.NET 10 Minimal API** 后端。工具计算全部在浏览器本地完成，**数据不外发给第三方**；仅 IP 归属地查询与访客 IP 探测经由本站服务端。

> ⚠️ 开发 / 维护前请先阅读 [AGENTS.md](./AGENTS.md)（项目强制开发规则）。

## 功能

| 工具                    | 说明                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| **编码转换**            |                                                                      |
| 图片工具箱              | 格式转换与等比缩放 / 批量压缩瘦身 / Favicon 多尺寸 / EXIF 查看与清除 |
| 文本编解码              | Base64 / URL / HTML 实体 / Base32 编解码，支持文本与文件             |
| PDF 合并 / 拆分         | 多个 PDF 合并或按页码区间提取页面                                    |
| URL 参数解析            | URL / 查询串拆成键值表，可重新编码输出                               |
| 颜色格式转换            | HEX / RGB / HSL 互转，附对比度与可读性参考                           |
| 单位换算                | 长度 / 重量 / 面积 / 体积 / 数据存储 / 温度一次列全                  |
| 进制转换                | 2/8/10/16 与任意 2-36 进制互转，BigInt 不丢精度                      |
| 文本密码与编码          | ROT13 / 凯撒移位 / 摩斯电码 / Base58 编解码                          |
| **生成器**              |                                                                      |
| 二维码                  | 生成（可调纠错级别导出 PNG）与识别（拆解 WiFi 分享码）               |
| 随机生成器              | 批量 UUID v4 / NanoID 短码 / 强密码 / 中文假文，Web Crypto 真随机    |
| **文本数据**            |                                                                      |
| JSON 工具箱             | 格式化 / 校验 / 层级树 + CSV / XML / YAML 双向转换                   |
| 文本批处理              | 去重 / 排序 / 大小写 / 空白清理 / 字数统计                           |
| 文本 diff 对比          | 逐行对比两段文本，标出新增与删除                                     |
| 正则测试                | 实时匹配结果、捕获分组与替换效果                                     |
| Markdown 表格           | CSV 转 Markdown 表格，支持对齐方式                                   |
| Markdown 预览           | GFM 实时渲染，可复制 HTML / 导出 PDF                                 |
| 人民币金额大写          | 数字与大写双向互转，零的写法遵循票据规范                             |
| **开发辅助**            |                                                                      |
| JSON 转类型定义         | 推断成 TypeScript / Go / Python / Java / C# 类型，合并数组内对象字段 |
| 哈希计算                | MD5 与 SHA-1 / 256 / 384 / 512，文本与文件均可                       |
| 校验和 / 校验位         | CRC-32 / Adler-32 校验和，Luhn 与 ISBN-10/13 校验位算检              |
| 加密与令牌              | AES-GCM 加解密 / JWT 解析 / TOTP 动态验证码                          |
| 时间工具箱              | 时间戳换算 / 日期计算 / Cron 解析与执行时间预测                      |
| JavaScript 压缩         | terser 压缩与混淆，含大小对比                                        |
| cURL 转代码             | cURL 命令转 fetch / axios / Python requests                          |
| HTTP 状态码 / MIME 速查 | 状态码与 Content-Type 对照表，可过滤                                 |
| Unicode 字符查询        | 逐码点看 UTF-8 / HTML 实体 / JS 转义，可反向还原                     |
| 命名风格转换            | camelCase / snake_case 等 8 种命名风格互转                           |
| IP 工具                 | CIDR 子网计算（本地）+ 归属地查询与我的公网 IP（服务端）             |
| 证件与信息校验          | 身份证 / 银行卡 / 手机号校验 + 敏感信息批量脱敏                      |
| 测试数据生成            | 批量生成能通过校验的假数据，可导出 CSV / JSON                        |
| UTM 跟踪链接            | 追加 utm 参数并校验空格，已有 UTM 会被覆盖而非追加                   |
| SQL 格式化              | 关键字大写 / 子句换行 / 压缩，字面量与注释原样保留                   |
| 编码探测                | 判断 UTF-8 / GBK / Big5 与乱码来源，逐个编码对比                     |

> 首页支持按关键词搜索（匹配标题 / 描述 / id / 标签）与按分类筛选，分类定义见
> `src/data/tools.js` 导出的 `categories`。
>
> **JSON 转类型定义**的推断能力：数组里放多个对象时会自动合并字段并集，只在部分
> 样本出现的字段标记为可选（TS `?` / Go `,omitempty` / Python `= None`）；同层
> 出现不同类型时合并为联合类型（Go、Java 与 C# 无联合类型，退化为 `interface{}` /
> `Object` / `object`）。各语言默认命名风格不同，切换语言时自动套用：Go 与 C# 用
> PascalCase、Python 用 snake_case、Java 用 camelCase、TypeScript 保留原键名。
> 非法键名按语言兜底（Python 保留字加下划线、C# 保留字加 `@` 前缀、数字开头补前缀、
> 纯符号键用哈希），Go 的 `json` tag 与 C# 的 `[JsonPropertyName]` 始终保留原始键名。
>
> **C# 的特殊处理**：使用属性语法（`{ get; set; }`）并输出 `#nullable enable`；
> 值类型不可为 null，所以可选的 `int` / `long` / `double` / `bool` 会包一层
> `Nullable<T>`（写成 `int?`），引用类型则不加问号。JSON 数字不带 int/long 之分，
> 超出 int32 值域时按 `long` 生成、否则 `int`，浮点一律 `double`。
>
> **证件与信息校验**的能力边界：身份证按 GB 11643 校验位规则（15 位老号按规则升位后
> 只做格式与信息抽取、不判末位），同时校验地区码、生日有效性与闰年；银行卡复用
> `checksum.js` 的 Luhn 并按 BIN 粗分卡组织；手机号校验号段并识别三大运营商。
> 校验**只判断格式与校验位是否自洽，不代表号码真实存在或属于某人**。
> 脱敏支持手机号 / 身份证 / 银行卡 / 姓名 / 邮箱 / 地址 / 车牌，可单条也可按行批量，
> 原文只在浏览器本地处理，不上传不留存。
>
> **人民币金额大写**按《正确填写票据和结算凭证的基本规定》实现：数字用零壹贰叁肆伍陆柒捌玖、
> 单位用拾佰仟万亿；难点全在零的写法（`壹万零壹` 而非 `壹万零零壹`、整十不补零 `壹拾壹`）、
> 节权组合（`壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖`），以及「整」只在没有任何角分时才加。
> 反向解析只接受规范写法，位序颠倒、单位重复、缺「元」都会判错并说明原因，**不做容错猜测**。
> ⚠ 小数位按 `toFixed(2)` 处理，浮点尾数（如 `1.555`）遵循 IEEE 754 而非十进制直觉。
>
> **测试数据生成**的核心约束：号码类数据由本站校验算法反算末位（身份证用 GB 11643、
> 银行卡用 Luhn），因此**能通过 `validateIdCard` / `validateBankCard`**——
> 否则联调时会被校验拦下，反而分不清是数据问题还是校验有 bug。随机源为 Web Crypto +
> 拒绝采样。数据为随机构造，不对应任何真实个人。
>
> **UTM 跟踪链接**拒绝含空格的参数值（统计平台会把空格换成下划线，导致归因对不上），
> 已有 UTM 参数会被**覆盖而非追加**（追加会产生两个 `utm_source`，多数工具只取第一个）。
>
> **SQL 格式化**只调整空白与关键字大小写，**不校验语法也不改写语义**。字符串、`--` 与
> `/* */` 注释、`"引号"` 与 `` `反引号` `` 标识符、`$$ 美元引号`内的内容原样保留。
> 不处理方言差异，按 MySQL / PostgreSQL 共有语法工作。
>
> **编码探测**给的是「最可能」而非「确定」：GBK 与 Big5 字节区间高度重叠，短文本无法区分
> （此时置信度标为低），二进制文件会被误判。已丢失的信息（已被替换成 `?` 的字符）无法还原。
> 页面提供逐编码横向对比，因为很多场景下**肉眼比算法更可靠**。

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
│  │  ├─ utils/                #   公共函数（base64/md5/sha/aes/json/JSON 树/JSON转类型/证件校验/脱敏/金额大写/UTM/假数据/ROT13·摩斯·Base58/SQL格式化/编码探测/url/查询串/时间戳/CSV/JWT/文本处理/空白清理/EXIF/Cron/Unicode/Markdown表格/XML↔JSON/命名/进制/IP子网/日期/Service Worker 更新检测…）
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
│  ├─ nginx.bt.conf            #   ★ 线上唯一生效配置的仓库副本（宝塔托管的宿主机 nginx）
│  ├─ nginx.docker.conf        #   compose 内 nginx 容器用（upstream 用服务名 web / api）
│  └─ nginx.conf               #   无面板环境的宿主机 nginx 参考模板（当前未部署）
├─ public/                     # 静态资产（favicon / apple-touch-icon / logo.svg /
│                              #   manifest.webmanifest / sw.js / PWA 图标）
├─ tests/                      # 单元测试（utils/ 公共纯函数、tools/ 页面私有算法）
├─ Dockerfile                  # 前端两阶段构建，运行阶段只含 dist + server.js
└─ docker-compose.yml          # web（127.0.0.1:8701:3000）+ api（127.0.0.1:8702:8080）+ nginx（8080:80，仅 local profile）
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
├─ utils/          # 公共纯函数，按模块一一对应（43 个 spec）
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
宿主机的 nginx 由**宝塔面板**托管，其线上实配记录在 `deploy/nginx.bt.conf`。

```
浏览器 → 宿主机 nginx（宝塔，80/443，TLS + 分流 + 安全头）  ← 实配见 deploy/nginx.bt.conf
           ├─ /api/     → proxy_pass 127.0.0.1:8702 → API 容器（.NET，IP 归属地 / 访客 IP）
           └─ 其余路径  → proxy_pass 127.0.0.1:8701 → 静态容器（Node，dist/ + SPA fallback）
```

> ⚠ **`deploy/nginx.conf` 不是线上实配**，只是无面板环境的参考模板。审计安全性、改分流或加响应头时，
> 必须对着 `nginx.bt.conf` 判断，否则会得出「仓库写了但线上没生效」的错误结论（已经踩过一次）。
> 三份配置的完整职责划分见 [AGENTS.md](./AGENTS.md) §7。

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
- 它挂载的是 **`deploy/nginx.docker.conf`** —— upstream 写的是 compose 服务名（`web` / `api`），
  只能给容器里的 nginx 用；宿主机侧的另外两份（线上实配 `nginx.bt.conf`、参考模板 `nginx.conf`）
  写的是 `127.0.0.1:映射端口`。**三份不能混用。**
- 本机访问时「我的 IP」会显示容器网关地址（形如 `172.18.0.1`）而不是真实公网 IP —— 本机环境拿不到
  自己的公网出口地址，属正常现象；线上经真实 nginx 反代时会正确显示访客地址。

### 步骤

```bash
docker compose up -d --build   # 构建并后台启动 web + api（nginx 属 local profile，不会被启动）
docker compose logs -f         # 查看日志（加服务名可只看一个：logs -f api）
docker compose down            # 停止并移除容器
```

1. `web` 映射到宿主机 **8701**、`api` 映射到 **8702**，两个端口都**只绑回环**（`127.0.0.1:` 前缀），公网入口一律走宿主机 nginx；
   换端口改 `ports` 的**中间**一段数字，**不要删掉 `127.0.0.1:` 前缀** —— 删了等于把 API 直接挂到公网，
   而 `/api/ip` 信任 `X-Real-IP` / `X-Forwarded-For`，届时任何人都能伪造来源地址（覆盖这两个头的是 nginx，不是容器）；
2. 宿主机 nginx 配 `/api/` 分流，按你的环境二选一：
   - **宝塔（线上现状）**：站点先设为反代到 `http://127.0.0.1:8701`，再在「配置文件」的
     `#SERVER-BLOCK START/END` 段内补上 `location ^~ /api/` 指向 `127.0.0.1:8702` ——
     整段可直接照抄 `deploy/nginx.bt.conf`。只有这一段面板不会覆盖，自定义务必写在这里；
     用面板 UI 改的项（证书、强制 HTTPS、TLS 协议版本）改完要把结果**回填进该副本**。
   - **无面板**：把 `deploy/nginx.conf` 放进 `sites-enabled/`（改 `server_name` 与两个 `proxy_pass` 端口），
     HTTPS 用 `certbot --nginx -d your.domain.com` 一键补齐。
     两种方式都必须先 `nginx -t` 通过再 reload —— 本机没有 nginx 与 Docker，这一步只能在服务器上验。
3. 验证分流与来源 IP 传递：`curl -s https://<域名>/api/ip` 应返回你的公网出口地址；
   若返回 `172.x` 之类的容器网关地址，说明 `X-Real-IP` 没有正确传递，反代头需要回查。

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

`deploy/nginx.conf` 是**无面板环境的参考模板**（本站线上实配记录在 `deploy/nginx.bt.conf`）；
真实环境往往已经有自己的站点配置（证书路径、其他站点、面板模板）。
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

> 宝塔有两个「面板不会覆盖」的落点：主配置里的 `#SERVER-BLOCK START/END` 段，以及上面说的 `extension/` 目录。
> 本站线上目前用的是前者（`/api/` 直接写在主配置的 SERVER-BLOCK 段内，与 `deploy/nginx.bt.conf` 一致）。
> 无论用哪一个，`extension/*.conf` 的内容都**不在主配置文件里**，排障时容易漏看；
> 只要往那里挪了东西，就要同步回填 `nginx.bt.conf`，否则仓库副本又变成假的实配。

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
docker run -d --name pocketbox --restart unless-stopped -p 127.0.0.1:8701:3000 pocketbox:latest

# API 容器（构建上下文是 backend/）
docker build -t pocketbox-api:latest ./backend
docker run -d --name pocketbox-api --restart unless-stopped -p 127.0.0.1:8702:8080 pocketbox-api:latest

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
pnpm install         # electron / electron-builder 在 devDependencies，electron-updater 在 dependencies
pnpm electron:dev    # 开发：Vite dev server + Electron，IP 接口走 vite proxy（需本地后端 5048）
pnpm electron:build  # 打包：注入 VITE_API_BASE → vite build → electron-builder，Windows 安装包输出到 release/
GH_TOKEN=... pnpm electron:release  # 打包并发布到 GitHub Releases（桌面端的更新源）
```

- **加载方式**：生产模式由主进程注册 `app://pocketbox` 自定义协议托管 `dist/`，History 路由无需改成 hash 模式
- **IP 归属地**：复用线上 API（后端 CORS 白名单仅 `app://pocketbox`），数据口径与 Web 端一致；33 个纯本地工具零改动
- **自动更新**：打包后 `electron/main.cjs` 用 electron-updater 检查 **GitHub Releases**（`pixris-x/PocketBox`，
  源配置在 `package.json` 的 `build.publish`）。发现新版即后台下载，下次退出应用时完成安装。
  这是桌面端唯一的第三方外发，只携带版本号与系统架构，不含用户数据；Web 版仍走 SW 更新，不受影响
- **发布流程**：改 `package.json` 的 `version` → `pnpm electron:release`。安装包名固定为
  `PocketBox-Setup-<version>.exe`（无空格，避免 `latest.yml` 与实际资产名不一致导致更新 404）
- **Service Worker**：桌面环境自动跳过（`electron/preload.cjs` 暴露标识，判定收在 `common/utils/desktop.js`），更新一律走上面的 electron-updater
- 未做代码签名时 Windows SmartScreen 会告警，属正常现象

> ⚠ **上面这条自动更新目前对外不可用，代码已就绪但客户端拿不到更新。**
> 原因：`pixris-x/PocketBox` 是 **private** 仓库，而 electron-updater 在用户机器上发起的是匿名请求，
> 私有仓库的 Releases API 与资产下载地址都需要鉴权，未授权一律 404。
> `GH_TOKEN` 只让「发布」成立，解决不了「客户端拉取」；**绝不能把 token 配进 `build.publish`**，
> 那等于把私有仓库的读权限打进分发的安装包交出去。
> 现状下的升级方式：去 Releases 页面手动下载 exe 重装。
> 要真正启用，三选一（详见 AGENTS.md §7.1）：仓库转 public / `provider` 改为 `generic` 指本站
> `https://pocketbox.pixris.online/desktop/` / 另建一个只放 Release 资产的 public 仓库。
> 另注：仓库至今没有发布过任何 Release，这条链路一次都没真跑通过。

## 依赖登记

### 前端依赖（npm）

| 包                 | 版本   | 用途                                                                          |
| ------------------ | ------ | ----------------------------------------------------------------------------- |
| vue                | ^3.5   | 框架                                                                          |
| vue-router         | ^4.5   | 路由                                                                          |
| js-md5             | ^0.8   | MD5 摘要                                                                      |
| qrcode-generator   | ^2.0   | 二维码矩阵计算（纯计算、无子依赖；Canvas 渲染与导出自行实现）                 |
| jsqr               | ^1.4   | 二维码识别（纯解码库，从图片像素解出文本，本地运行）                          |
| pdf-lib            | ^1.17  | PDF 合并 / 拆分（纯 JS 读写，本地运行，不依赖服务端）                         |
| js-yaml            | ^5.4   | YAML ↔ JSON 互转（纯 ESM 命名导出，本地解析）                                 |
| marked             | ^18    | Markdown 渲染（输出放 sandbox iframe 中预览）                                 |
| terser             | ^5.36  | JavaScript 压缩（Vite `?worker` 打包，Worker 中运行）                         |
| vite               | ^7     | 构建                                                                          |
| @vitejs/plugin-vue | ^6     | Vue SFC 编译                                                                  |
| sass               | ^1.80  | SCSS 编译                                                                     |
| electron           | ^44.4  | 桌面端运行时（devDependencies，仅 Electron 构建用）                           |
| electron-builder   | ^26.15 | 桌面端打包（devDependencies，仅 Electron 构建用）                             |
| electron-updater   | ^6.8   | 桌面端自动更新（**dependencies**：要被打包进 app.asar，主进程运行时 require） |

> `electron-updater` 放在 `dependencies` 而非 `devDependencies` 是有意的：electron-builder
> 只把生产依赖复制进安装包，放错位置会导致打包后的应用 `require` 失败。
> 它只被 `electron/main.cjs` 引用，不进 Web 端产物。

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
