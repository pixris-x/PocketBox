# AGENTS.md — 项目开发规则（强制约定）

本文件是 `webTool` 项目的开发与维护强制约束，所有新增功能、修复、重构都必须遵守。
任何 Agent（ZCode / Claude Code 等）在为本项目编写代码前，必须先阅读并遵循本规则。

## 1. 技术栈锁定

- 前端框架：**Vite + Vue 3 + vue-router**（当前 v1 为纯前端，无后端）。
- 包管理器：**只用 pnpm**，不得使用 npm / yarn，也不得混用。
- 语言：**只用 JavaScript（ESM）+ SCSS（dart-sass）**。**禁止引入 TypeScript**（不得添加 .ts/.tsx 文件或 ts 相关依赖）。
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
├─ data/            # 工具元数据 tools.js（首页网格 + 路由的唯一数据源）
├─ components/      # 站点级布局组件（AppHeader/AppFooter/ToolCard/ToolShell）
└─ views/
   ├─ Home/         # 首页（index.vue + style.scss）
   └─ tools/
      └─ <tool-id>/ # ★ 每个工具页一个独立文件夹
         ├─ index.vue      # 主 vue
         ├─ components/    # 页面私有组件
         ├─ styles/        # 页面私有样式
         └─ scripts/       # 页面私有脚本（逻辑/worker）
```

### 2.1 归属原则（重要）

- **可复用的纯算法**（base64 / md5 / json / url / 时间戳 / 复制 / 下载 / 主题）一律进 `common/utils/`。
- **页面专属逻辑**（密码生成、Canvas 图片转换、terser worker 封装、页面状态编排）放页面自身 `scripts/` 与 `components/`。
- **禁止复制粘贴公共函数**到页面目录；需要就用 `import` 引用。
- 页面文件夹结构约定统一（index.vue + components/ + styles/ + scripts/），某页不涉及某类时允许省略该子目录，但约定不变。

## 3. UI 规范

- 凡可用自研 UI 库组件（`UiButton` / `UiInput` / `UiSlider` / `UiSelect` / `UiTabs` / `UiCard` / `UiTag` / `UiSwitch` / `UiCheckbox` / `UiToast` 等）的场景，**必须使用组件库**，禁止另写一套样式。
- 新 UI 组件一律放入 `src/common/components/`，并在 `index.js` 注册后使用。
- 组件样式统一使用设计 token（CSS 变量），禁止出现硬编码颜色值。
- 操作反馈统一走 `useToast`。

## 4. 路由与工具注册

- 新增一个工具页只需两步：
  1. 在 `src/views/tools/<tool-id>/` 创建页面文件夹；
  2. 在 `src/data/tools.js` 添加一条元数据（id / 标题 / 描述 / 图标 / 路由）。
- 首页网格与路由均由 `tools.js` 自动生成，禁止手写路由表或首页卡片。

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

## 7. 未来后端

- 如后续引入后端 / 数据持久化，技术选型为 **.NET 10 + PostgreSQL**。
- 新增 `src/api/` 服务层，通过 fetch 调用后端接口；前端目录结构不变。
- v1 阶段无后端、无任何请求外发，全部工具在浏览器本地计算（隐私友好）。

## 8. 代码风格

- 组件一律使用 `<script setup>` 组合式 API。
- 样式优先 scoped；需要跨组件共享的样式放公共样式文件。
- 不写与逻辑无关的注释；命名自解释。
