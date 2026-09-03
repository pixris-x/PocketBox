// ============================================================
// 工具元数据（唯一数据源）
// 首页网格与路由均由本文件自动生成。
// 新增工具：1) 在 views/tools/<id>/ 建页面  2) 在此加一条
// id: 文件夹名（同时作为路由名），icon: 见 common/components/UiIcon/icons.js
// ============================================================
export const tools = [
  {
    id: 'password',
    path: '/tool/password',
    title: '随机强密码生成',
    description: '基于 Web Crypto 的真随机强密码，支持长度与字符集自定义',
    icon: 'key',
    tags: ['安全'],
  },
  {
    id: 'image-convert',
    path: '/tool/image-convert',
    title: '图片格式转换',
    description: 'PNG / JPEG / WebP 互转，支持质量调节与等比缩放',
    icon: 'image',
    tags: ['图片'],
  },
  {
    id: 'base64',
    path: '/tool/base64',
    title: 'Base64 转换',
    description: '文本与文件的 Base64 编码 / 解码，Unicode 安全',
    icon: 'code',
    tags: ['编码'],
  },
  {
    id: 'md5',
    path: '/tool/md5',
    title: 'MD5 哈希',
    description: '文本与文件的 MD5 摘要计算，可校验文件一致性',
    icon: 'hash',
    tags: ['哈希'],
  },
  {
    id: 'js-minify',
    path: '/tool/js-minify',
    title: 'JavaScript 压缩',
    description: '基于 terser 的 JS 压缩 / 混淆，含压缩前后大小对比',
    icon: 'terminal',
    tags: ['代码'],
  },
  {
    id: 'json',
    path: '/tool/json',
    title: 'JSON 格式化',
    description: 'JSON 格式化 / 压缩 / 校验，可选排序键',
    icon: 'braces',
    tags: ['数据'],
  },
  {
    id: 'url',
    path: '/tool/url',
    title: 'URL 编码 / 解码',
    description: 'URL 组件编码与解码，兼容查询串中的 + 号',
    icon: 'link',
    tags: ['编码'],
  },
  {
    id: 'timestamp',
    path: '/tool/timestamp',
    title: '时间戳转换',
    description: 'Unix 时间戳与日期互转，支持本地 / UTC',
    icon: 'clock',
    tags: ['时间'],
  },
  {
    id: 'uuid',
    path: '/tool/uuid',
    title: 'UUID 生成',
    description: '批量生成 UUID v4，支持大小写切换',
    icon: 'shuffle',
    tags: ['生成'],
  },
]
