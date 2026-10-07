import { describe, expect, it } from 'vitest'
import {
  UTM_FIELDS,
  UTM_PRESETS,
  buildUtmUrl,
  parseUtm,
  validateUtmValue,
} from '@/common/utils/utm'

describe('validateUtmValue 单值校验', () => {
  it('拒绝空格——GA 会把空格换成下划线导致归因对不上', () => {
    expect(validateUtmValue('from wechat').ok).toBe(false)
    expect(validateUtmValue('a\tb').ok).toBe(false)
  })

  it('接受常规值', () => {
    expect(validateUtmValue('wechat').ok).toBe(true)
    expect(validateUtmValue('spring_sale').ok).toBe(true)
    expect(validateUtmValue('cpc').ok).toBe(true)
  })

  it('空值判错', () => {
    expect(validateUtmValue('').ok).toBe(false)
    expect(validateUtmValue('   ').ok).toBe(false)
  })
})

describe('buildUtmUrl 构造链接', () => {
  it('基本拼接与参数顺序稳定', () => {
    const result = buildUtmUrl('https://pocketbox.pixris.online/', {
      utm_source: 'wechat',
      utm_medium: 'social',
    })
    expect(result.url).toBe('https://pocketbox.pixris.online/?utm_source=wechat&utm_medium=social')
    expect(result.included).toEqual(['utm_source', 'utm_medium'])
  })

  it('同组参数无论传入顺序都产出相同 URL', () => {
    const a = buildUtmUrl('https://x.com/', { utm_source: 's', utm_medium: 'm' })
    const b = buildUtmUrl('https://x.com/', { utm_medium: 'm', utm_source: 's' })
    expect(a.url).toBe(b.url)
  })

  it('覆盖已有 UTM 参数而非追加', () => {
    // 追加会产生两个 utm_source，多数统计工具只取第一个
    const result = buildUtmUrl('https://x.com/?utm_source=old&ref=9', { utm_source: 'new' })
    expect(result.url).toBe('https://x.com/?ref=9&utm_source=new')
    expect(result.url.match(/utm_source=/g)).toHaveLength(1)
  })

  it('保留原链接上的非 UTM 参数', () => {
    const result = buildUtmUrl('https://x.com/p?page=2&sort=asc', { utm_source: 's' })
    expect(result.url).toContain('page=2')
    expect(result.url).toContain('sort=asc')
  })

  it('hash 锚点留在最后且不参与参数', () => {
    const result = buildUtmUrl('https://x.com/p?a=1#top', { utm_source: 's' })
    expect(result.url).toBe('https://x.com/p?a=1&utm_source=s#top')
  })

  it('含空格的值被跳过并给出警告', () => {
    const result = buildUtmUrl('https://x.com/', { utm_source: 'from wechat' })
    expect(result.url).toBe('https://x.com/')
    expect(result.warnings.join()).toContain('不能包含空格')
  })

  it('缺 utm_source 时给出提醒', () => {
    const result = buildUtmUrl('https://x.com/', { utm_medium: 'email' })
    expect(result.warnings.join()).toContain('utm_source')
  })

  it('缺协议头时提醒但不阻断', () => {
    const result = buildUtmUrl('x.com/', { utm_source: 's' })
    expect(result.url).toBe('x.com/?utm_source=s')
    expect(result.warnings.join()).toContain('http')
  })

  it('无协议头链接不会被误解析出垃圾参数', () => {
    // parseQuery 对无协议头的链接会按「裸查询串」处理，
    // 曾产出 x.com%2F 这样的参数（把路径当成了键值对）
    const result = buildUtmUrl('x.com/p?a=1', { utm_source: 's' })
    expect(result.url).toBe('x.com/p?a=1&utm_source=s')
    expect(result.url).not.toContain('%2F')
  })

  it('空链接直接返回错误', () => {
    expect(buildUtmUrl('', {}).url).toBe('')
    expect(buildUtmUrl('', {}).warnings.join()).toContain('请输入基础链接')
  })

  it('超长值被截断', () => {
    const long = 'a'.repeat(150)
    const result = buildUtmUrl('https://x.com/', { utm_source: long })
    expect(result.warnings.join()).toContain('超过')
    expect(result.url.length).toBeLessThan(150)
  })

  it('预设值本身都合法', () => {
    for (const preset of Object.values(UTM_PRESETS)) {
      for (const [key, value] of Object.entries(preset)) {
        expect(validateUtmValue(value).ok).toBe(true)
        expect(UTM_FIELDS.map((f) => f.value)).toContain(key)
      }
    }
  })
})

describe('parseUtm 解析链接', () => {
  it('提取全部 UTM 参数', () => {
    const result = parseUtm('https://x.com/?utm_source=a&utm_medium=b&utm_campaign=c')
    expect(result.found).toBe(true)
    expect(result.params).toEqual({ utm_source: 'a', utm_medium: 'b', utm_campaign: 'c' })
  })

  it('报告缺失的字段', () => {
    const result = parseUtm('https://x.com/?utm_source=a')
    expect(result.missing).toContain('utm_medium')
    expect(result.missing).toContain('utm_campaign')
  })

  it('忽略非 UTM 参数', () => {
    const result = parseUtm('https://x.com/?ref=9&utm_source=a')
    expect(result.params).toEqual({ utm_source: 'a' })
  })

  it('无查询串或无 UTM 时 found 为 false', () => {
    expect(parseUtm('https://x.com/').found).toBe(false)
    expect(parseUtm('https://x.com/?ref=9').found).toBe(false)
    expect(parseUtm('').found).toBe(false)
  })

  it('往返一致', () => {
    const built = buildUtmUrl('https://x.com/p', { utm_source: 'wechat', utm_campaign: 'launch' })
    const parsed = parseUtm(built.url)
    expect(parsed.params.utm_source).toBe('wechat')
    expect(parsed.params.utm_campaign).toBe('launch')
  })
})
