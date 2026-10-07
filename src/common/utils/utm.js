// ============================================================
// UTM 跟踪链接构造（无副作用、无 DOM 依赖）
//
// UTM 是 Google Analytics 2009 年提出的一组标准查询参数，
// 用来标记流量来源。五个参数都有固定含义，缺 `utm_source` 与
// `utm_medium` 时多数统计工具会归因失败。
//
// 纯函数：只拼字符串，不发请求、不上报。
// ============================================================

import { buildQuery, parseQuery } from './query-string'

/** UTM 参数的标准定义（顺序即拼装顺序，避免同一组参数产生不同 URL） */
export const UTM_FIELDS = [
  { value: 'utm_source', label: '来源', hint: 'from / newsletter / wechat…' },
  { value: 'utm_medium', label: '媒介', hint: 'cpc / email / social / referral' },
  { value: 'utm_campaign', label: '活动', hint: 'spring_sale / launch_2026' },
  { value: 'utm_term', label: '关键词', hint: '付费搜索词，可留空' },
  { value: 'utm_content', label: '内容', hint: '区分同名按钮 / 素材' },
  { value: 'utm_id', label: '活动 ID', hint: '用于跨渠道归因，可留空' },
]

/** 各字段的合法字符：Google Analytics 允许的保守子集 */
const FIELD_RULES = {
  utm_source: { required: true, maxLength: 100 },
  utm_medium: { required: false, maxLength: 100 },
  utm_campaign: { required: false, maxLength: 100 },
  utm_term: { required: false, maxLength: 100 },
  utm_content: { required: false, maxLength: 100 },
  utm_id: { required: false, maxLength: 100 },
}

/**
 * 校验单个 UTM 值
 *
 * 关键限制是**不接受空格**——GA 会把空格替换成 `_`，
 * 导致你传 `from wechat` 却在报表里看到 `from_wechat`，归因对不上。
 * 这里提前判掉，而不是静默替换。
 * @param {string} value
 * @returns {{ok:boolean, reason?:string}}
 */
export function validateUtmValue(value) {
  const text = String(value ?? '').trim()
  if (/\s/.test(text)) return { ok: false, reason: '不能包含空格' }
  if (text === '') return { ok: false, reason: '不能为空' }
  return { ok: true }
}

/**
 * 构造 UTM 跟踪链接
 *
 * 已有 UTM 参数的链接会被**覆盖而非追加**——
 * 直接 append 会产出两个 `utm_source`，多数统计工具只取第一个，
 * 覆盖行为更符合直觉。
 * @param {string} baseUrl 基础链接，可带已有查询串
 * @param {object} params utm_* 键值对
 * @returns {{url:string, warnings:string[], included:string[]}}
 */
export function buildUtmUrl(baseUrl, params = {}) {
  const warnings = []
  const base = String(baseUrl ?? '').trim()
  if (!base) return { url: '', warnings: ['请输入基础链接'], included: [] }

  if (!/^https?:\/\//i.test(base)) {
    warnings.push('链接缺少 http(s):// 协议头，部分统计工具会拒绝')
  }

  // 拆掉 hash（锚点不该参与参数拼接）
  const hashIndex = base.indexOf('#')
  const hash = hashIndex >= 0 ? base.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? base.slice(0, hashIndex) : base
  // 路径部分：去掉查询串后的纯路径（无查询串时就是整个 base）
  const questionIndex = withoutHash.indexOf('?')
  const path = questionIndex >= 0 ? withoutHash.slice(0, questionIndex) : withoutHash

  // parseQuery 能直接吃查询串，但**要求有协议头**——传 `x.com/p?a=1` 这类无协议链接时，
  // 它会按「裸查询串」解析，把 `x.com/p` 当成第一个键值对，产出 `x.com%2F` 这类垃圾参数。
  // 因此这里只把「? 之后」的部分交给它。
  const parsed =
    questionIndex >= 0 ? parseQuery(withoutHash.slice(questionIndex + 1)) : { ok: false }
  // 剔除原有 UTM 参数，避免与新值重复产生两个 utm_source
  const kept = parsed.ok ? parsed.pairs.filter((pair) => !pair.key.startsWith('utm_')) : []

  const utmPairs = []
  const included = []
  for (const field of UTM_FIELDS) {
    const raw = params[field.value]
    const value = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw).trim()
    if (!value) {
      if (FIELD_RULES[field.value].required) {
        warnings.push(`${field.value}（${field.label}）建议填写，缺失可能导致来源归因失败`)
      }
      continue
    }

    const check = validateUtmValue(value)
    if (!check.ok) {
      warnings.push(`${field.value}：${check.reason}，已跳过`)
      continue
    }
    if (value.length > FIELD_RULES[field.value].maxLength) {
      warnings.push(`${field.value} 超过 ${FIELD_RULES[field.value].maxLength} 字符，已截断`)
    }
    utmPairs.push({ key: field.value, value: value.slice(0, FIELD_RULES[field.value].maxLength) })
    included.push(field.value)
  }

  const pairs = [...kept, ...utmPairs]
  return { url: path + buildQuery(pairs) + hash, warnings, included }
}

/**
 * 解析 URL 上的 UTM 参数
 * @param {string} url
 * @returns {{found:boolean, params:object, missing:string[]}}
 */
export function parseUtm(url) {
  const text = String(url ?? '')
  const questionIndex = text.indexOf('?')
  // 与 buildUtmUrl 同理：只把「? 之后」交给 parseQuery，
  // 否则无协议头链接会被当成裸查询串，把路径解析成第一个参数
  if (questionIndex < 0) {
    return { found: false, params: {}, missing: UTM_FIELDS.map((f) => f.value) }
  }
  const hashIndex = text.indexOf('#')
  const query =
    hashIndex > questionIndex
      ? text.slice(questionIndex + 1, hashIndex)
      : text.slice(questionIndex + 1)

  const parsed = parseQuery(query)
  if (!parsed.ok) {
    return { found: false, params: {}, missing: UTM_FIELDS.map((f) => f.value) }
  }

  const params = {}
  for (const field of UTM_FIELDS) {
    const found = parsed.pairs.find((pair) => pair.key === field.value)
    if (found && found.value) params[field.value] = found.value
  }

  return {
    found: Object.keys(params).length > 0,
    params,
    missing: UTM_FIELDS.filter((f) => !params[f.value]).map((f) => f.value),
  }
}

/** 工具页的常用预设，减少从零填参的门槛 */
export const UTM_PRESETS = {
  wechat: { utm_source: 'wechat', utm_medium: 'social', utm_campaign: 'group_share' },
  weibo: { utm_source: 'weibo', utm_medium: 'social', utm_campaign: 'post_share' },
  newsletter: { utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'weekly' },
  banner: { utm_source: 'site', utm_medium: 'referral', utm_campaign: 'banner' },
}
