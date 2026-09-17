// ============================================================
// 工具元数据（唯一数据源）
// 首页网格、分类筛选与路由均由本文件自动生成。
// 新增工具：1) 在 views/tools/<id>/ 建页面  2) 在此加一条
// id: 文件夹名（同时作为路由名），icon: 见 common/components/UiIcon/icons.js
// category: 必须取自下方 categories 的 id（首页分类筛选依据）
// tags: 卡片角标展示，同时作为首页搜索的匹配关键词
// ============================================================

// 工具分类（首页筛选项的唯一来源，数组顺序即展示顺序）
export const categories = [
  { id: 'convert', label: '编码转换' },
  { id: 'generate', label: '生成器' },
  { id: 'text', label: '文本数据' },
  { id: 'dev', label: '开发辅助' },
]

// ============================================================
// 关于「合并页」约定（2026-09-18 起）
//   - 同输入形态、低频的同类工具合并为一页，用 UiTabs 切子面板
//     （子面板在 <id>/components/<Name>Panel/，由容器 index.vue 装配）
//   - 当前 Tab 同步到 URL：?tab=xxx（可分享 / 刷新保留）
//   - 被合并的旧路径在 router 里由 LEGACY_REDIRECTS 重定向到对应 Tab；
//     **旧关键词不要从 tags 里删掉**，否则首页搜索会漏
//   - 单个合并页的 Tab 数控制在 4 个以内，超过就该拆
// ============================================================

export const tools = [
  // ---------- 编码转换 ----------
  {
    id: 'image',
    path: '/tool/image',
    title: '图片工具箱',
    description: '格式转换与等比缩放、Favicon 多尺寸导出、EXIF 元数据查看与清除，图片不上传',
    icon: 'image',
    category: 'convert',
    tags: ['图片', '格式转换', 'Favicon', 'EXIF', '隐私'],
  },
  {
    id: 'pdf-tool',
    path: '/tool/pdf-tool',
    title: 'PDF 合并 / 拆分',
    description: '多个 PDF 合并或按页码区间提取页面，pdf-lib 本地处理不上传',
    icon: 'file-text',
    category: 'convert',
    tags: ['文档', 'PDF'],
  },
  {
    id: 'encoding',
    path: '/tool/encoding',
    title: '文本编解码',
    description: 'Base64 与 URL 的编码 / 解码，支持文本与文件，Unicode 安全',
    icon: 'code',
    category: 'convert',
    tags: ['编码', 'Base64', 'URL'],
  },
  {
    id: 'url-parse',
    path: '/tool/url-parse',
    title: 'URL 参数解析',
    description: '把 URL / 查询串拆成键值表，自动解码并可重新编码输出',
    icon: 'link',
    category: 'convert',
    tags: ['编码', '查询串'],
  },
  {
    id: 'color-convert',
    path: '/tool/color-convert',
    title: '颜色格式转换',
    description: 'HEX / RGB / HSL 互转，附对比度与可读性参考',
    icon: 'palette',
    category: 'convert',
    tags: ['转换', '颜色'],
  },
  {
    id: 'unit-convert',
    path: '/tool/unit-convert',
    title: '单位换算',
    description: '长度 / 重量 / 面积 / 体积 / 数据存储 / 温度的单位互转，一次列全',
    icon: 'repeat',
    category: 'convert',
    tags: ['换算', '单位'],
  },
  {
    id: 'base-convert',
    path: '/tool/base-convert',
    title: '进制转换',
    description: '2/8/10/16 进制与任意 2-36 进制互转，整数任意精度不丢精度',
    icon: 'binary',
    category: 'convert',
    tags: ['换算', '进制'],
  },

  // ---------- 生成器 ----------
  {
    id: 'qrcode',
    path: '/tool/qrcode',
    title: '二维码',
    description: '文本与链接生成二维码（可调纠错级别并导出 PNG），也能识别图片中的二维码',
    icon: 'qrcode',
    category: 'generate',
    tags: ['生成', '二维码', '扫码', 'WiFi'],
  },
  {
    id: 'random',
    path: '/tool/random',
    title: '随机生成器',
    description: '批量生成 UUID v4、随机强密码与中文假文，随机源来自 Web Crypto',
    icon: 'shuffle',
    category: 'generate',
    tags: ['生成', 'UUID', '密码', '假文'],
  },

  // ---------- 文本数据 ----------
  {
    id: 'json',
    path: '/tool/json',
    title: 'JSON 工具箱',
    description: 'JSON 格式化 / 压缩 / 校验与层级树，以及与 CSV、XML、YAML 的双向转换',
    icon: 'braces',
    category: 'text',
    tags: ['数据', 'JSON', 'CSV', 'XML', 'YAML'],
  },
  {
    id: 'text-toolkit',
    path: '/tool/text-toolkit',
    title: '文本批处理',
    description: '粘贴一段文本，一次完成去重、排序、大小写转换、空白清理与字数统计',
    icon: 'list',
    category: 'text',
    tags: ['文本', '去重', '排序', '空白'],
  },
  {
    id: 'text-diff',
    path: '/tool/text-diff',
    title: '文本 diff 对比',
    description: '逐行对比两段文本，标出新增与删除的行',
    icon: 'diff',
    category: 'text',
    tags: ['文本', '对比'],
  },
  {
    id: 'regex',
    path: '/tool/regex',
    title: '正则测试',
    description: '实时查看正则匹配结果、捕获分组与替换效果',
    icon: 'regex',
    category: 'text',
    tags: ['文本', '正则'],
  },
  {
    id: 'md-table',
    path: '/tool/md-table',
    title: 'Markdown 表格',
    description: 'CSV 转 Markdown 表格，支持对齐方式与自定义分隔符',
    icon: 'file-text',
    category: 'text',
    tags: ['文本', 'Markdown'],
  },
  {
    id: 'markdown',
    path: '/tool/markdown',
    title: 'Markdown 预览',
    description: '实时渲染 GFM（表格 / 任务列表 / 代码块），可复制 HTML 或导出 PDF',
    icon: 'file-text',
    category: 'text',
    tags: ['文本', 'Markdown', 'PDF'],
  },

  // ---------- 开发辅助 ----------
  {
    id: 'hash',
    path: '/tool/hash',
    title: '哈希计算',
    description: 'MD5 / SHA-1 / SHA-256 / SHA-384 / SHA-512 摘要计算，文本与文件均可',
    icon: 'hash',
    category: 'dev',
    tags: ['哈希', 'MD5', 'SHA', '校验'],
  },
  {
    id: 'crypto',
    path: '/tool/crypto',
    title: '加密与令牌',
    description: 'AES-GCM 加解密、JWT 解析、TOTP 动态验证码，密钥与令牌都不出浏览器',
    icon: 'shield',
    category: 'dev',
    tags: ['安全', 'AES', 'JWT', 'TOTP'],
  },
  {
    id: 'datetime',
    path: '/tool/datetime',
    title: '时间工具箱',
    description: 'Unix 时间戳换算、日期间隔与加减计算、Cron 表达式解析与执行时间预测',
    icon: 'clock',
    category: 'dev',
    tags: ['时间', '时间戳', '日期', 'Cron'],
  },
  {
    id: 'js-minify',
    path: '/tool/js-minify',
    title: 'JavaScript 压缩',
    description: '基于 terser 的 JS 压缩 / 混淆，含压缩前后大小对比',
    icon: 'terminal',
    category: 'dev',
    tags: ['代码', '压缩'],
  },
  {
    id: 'curl-convert',
    path: '/tool/curl-convert',
    title: 'cURL 转代码',
    description: '把 cURL 命令转成 fetch / axios / Python requests 代码',
    icon: 'terminal',
    category: 'dev',
    tags: ['代码', 'curl', '接口'],
  },
  {
    id: 'http-codes',
    path: '/tool/http-codes',
    title: 'HTTP 状态码 / MIME 速查',
    description: '常用状态码与 Content-Type 对照表，按关键词过滤',
    icon: 'info',
    category: 'dev',
    tags: ['网络', 'HTTP'],
  },
  {
    id: 'unicode',
    path: '/tool/unicode',
    title: 'Unicode 字符查询',
    description: '逐码点查看 UTF-8 字节 / HTML 实体 / JS 转义，并支持反向还原',
    icon: 'type',
    category: 'dev',
    tags: ['编码', 'Unicode'],
  },
  {
    id: 'naming-convert',
    path: '/tool/naming-convert',
    title: '命名风格转换',
    description: '在 camelCase / snake_case / kebab-case 等八种命名风格间互相转换',
    icon: 'type',
    category: 'dev',
    tags: ['文本', '命名'],
  },
  {
    id: 'ip-subnet',
    path: '/tool/ip-subnet',
    title: 'IP 工具',
    description: 'CIDR 子网计算、IP 归属地查询与我的公网 IP',
    icon: 'shuffle',
    category: 'dev',
    tags: ['网络', 'IP'],
  },
]
