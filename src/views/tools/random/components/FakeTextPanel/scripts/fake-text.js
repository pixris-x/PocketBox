// ============================================================
// 中文假文词库与生成逻辑（页面专属，供测试数据填充使用）
// 词库为常用双字词 / 三字词的混合，按「词 → 句 → 段」三级随机组装
// ============================================================

const WORDS = [
  '系统',
  '数据',
  '功能',
  '模块',
  '服务',
  '接口',
  '配置',
  '用户',
  '流程',
  '消息',
  '测试',
  '环境',
  '版本',
  '记录',
  '状态',
  '任务',
  '结果',
  '内容',
  '资源',
  '权限',
  '日志',
  '缓存',
  '网络',
  '页面',
  '组件',
  '样式',
  '参数',
  '对象',
  '方法',
  '属性',
  '文件',
  '目录',
  '表格',
  '图表',
  '统计',
  '分析',
  '策略',
  '方案',
  '目标',
  '进度',
  '质量',
  '效率',
  '稳定',
  '安全',
  '隐私',
  '传输',
  '存储',
  '计算',
  '处理',
  '管理',
  '设计',
  '架构',
  '开发',
  '部署',
  '运维',
  '监控',
  '告警',
  '优化',
  '迭代',
  '评审',
  '产品',
  '需求',
  '场景',
  '体验',
  '交互',
  '响应',
  '反馈',
  '协作',
  '沟通',
  '同步',
]

const CONNECTORS = ['与', '和', '及', '或', '在', '对', '从', '向', '为', '按']

const TAILS = ['。', '。', '。', '；', '？', '！']

/** 取 [0, max) 的随机整数（Web Crypto，避免 Math.random 的可预测性） */
function randomInt(max) {
  if (max <= 0) return 0
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.getRandomValues) {
    const range = 0x100000000
    const limit = range - (range % max)
    const buf = new Uint32Array(1)
    do {
      cryptoObj.getRandomValues(buf)
    } while (buf[0] >= limit)
    return buf[0] % max
  }
  return Math.floor(Math.random() * max)
}

function pick(list) {
  return list[randomInt(list.length)]
}

/** 生成一个随机句子：4-8 个词，偶尔用连接词衔接，以标点收尾 */
function makeSentence() {
  const count = 4 + randomInt(5)
  const parts = []
  for (let i = 0; i < count; i++) {
    if (i > 0 && randomInt(4) === 0) parts.push(pick(CONNECTORS))
    parts.push(pick(WORDS))
  }
  return parts.join('') + pick(TAILS)
}

/** 生成一个段落：3-6 个句子 */
function makeParagraph() {
  const count = 3 + randomInt(4)
  const sentences = []
  for (let i = 0; i < count; i++) sentences.push(makeSentence())
  return sentences.join('')
}

/**
 * 生成假文
 * @param {{paragraphs?: number}} [options]
 * @returns {string} 段落之间以空行分隔
 */
export function generateFakeText({ paragraphs = 3 } = {}) {
  const count = Math.min(20, Math.max(1, Math.round(paragraphs) || 3))
  const result = []
  for (let i = 0; i < count; i++) result.push(makeParagraph())
  return result.join('\n\n')
}
