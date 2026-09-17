import { describe, it, expect } from 'vitest'
import { parseCron, getCronNextRuns, describeCron } from '@/common/utils/cron'

// 锚点固定为 2026-09-17（周四）12:00 本地时间，期望值全部手工推算
const ANCHOR = new Date(2026, 8, 17, 12, 0, 0)

function run(expr, count = 3, from = ANCHOR) {
  return getCronNextRuns(expr, from, count).map((d) => d.getTime())
}

const at = (y, m, d, h, min) => new Date(y, m - 1, d, h, min, 0).getTime()

describe('parseCron', () => {
  it('五段通配符解析为全通配', () => {
    const parsed = parseCron('* * * * *')
    expect(parsed.ok).toBe(true)
    expect(Object.values(parsed.fields).every((f) => f.wildcard)).toBe(true)
  })

  it('宏展开：@daily 等价 0 0 * * * 并保留原名', () => {
    const parsed = parseCron('@daily')
    expect(parsed.ok).toBe(true)
    expect(parsed.macro).toBe('@daily')
    expect(parsed.expression).toBe('0 0 * * *')
  })

  it('字段数错误 / 数值越界 / 步进为 0 / 非法字符均有中文错误', () => {
    expect(parseCron('* * * *').ok).toBe(false)
    expect(parseCron('61 * * * *').error).toContain('分钟')
    expect(parseCron('*/0 * * * *').error).toContain('步进')
    expect(parseCron('a * * * *').error).toContain('分钟')
    expect(parseCron('').error).toContain('为空')
  })

  it('英文月名与星期名大小写不敏感，dow 的 7 归一为周日', () => {
    const a = parseCron('0 12 * JAN-MAR *')
    expect(a.ok).toBe(true)
    expect(a.fields.month.values).toEqual([1, 2, 3])

    const b = parseCron('0 0 * * sun')
    const c = parseCron('0 0 * * 7')
    const d = parseCron('0 0 * * 0')
    expect(b.fields.dow.values).toEqual([0])
    expect(c.fields.dow.values).toEqual([0])
    expect(d.fields.dow.values).toEqual([0])
  })

  it('环绕范围拆为两段（11-1 月 → 11、12、1）', () => {
    const parsed = parseCron('0 0 1 11-1 *')
    expect(parsed.fields.month.values).toEqual([1, 11, 12])
  })

  it('describeCron 输出中文概述', () => {
    expect(describeCron(parseCron('0 9 * * 1-5'))).toBe(
      '每月 每日（周一、二、三、四、五）9 点 第 0 分'
    )
  })
})

describe('getCronNextRuns', () => {
  it('每分钟：下一分钟即命中，秒被截断', () => {
    const from = new Date(2026, 8, 17, 12, 30, 15)
    expect(run('* * * * *', 3, from)).toEqual([
      at(2026, 9, 17, 12, 31),
      at(2026, 9, 17, 12, 32),
      at(2026, 9, 17, 12, 33),
    ])
  })

  it('工作日 9 点（1-5）：跳过周末', () => {
    expect(run('0 9 * * 1-5')).toEqual([
      at(2026, 9, 18, 9, 0), // 周五
      at(2026, 9, 21, 9, 0), // 周一
      at(2026, 9, 22, 9, 0), // 周二
    ])
  })

  it('步进 */15', () => {
    expect(run('*/15 * * * *', 3, new Date(2026, 8, 17, 12, 30, 0))).toEqual([
      at(2026, 9, 17, 12, 45),
      at(2026, 9, 17, 13, 0),
      at(2026, 9, 17, 13, 15),
    ])
  })

  it('dom 与 dow 同时受限按 vixie 规则取「或」', () => {
    expect(run('30 4 1,15 * 5')).toEqual([
      at(2026, 9, 18, 4, 30), // 周五（dow 命中）
      at(2026, 9, 25, 4, 30), // 周五
      at(2026, 10, 1, 4, 30), // 1 日（dom 命中，当天是周四）
    ])
  })

  it('跨年：每年元旦', () => {
    expect(run('0 0 1 1 *', 1)).toEqual([at(2027, 1, 1, 0, 0)])
  })

  it('dow=7 与 sun 等价', () => {
    expect(run('0 0 * * 7', 1)).toEqual([at(2026, 9, 20, 0, 0)])
    expect(run('0 0 * * SUN', 1)).toEqual([at(2026, 9, 20, 0, 0)])
  })

  it('英文月名范围 JAN-MAR：9 月之后下一个是次年 1 月', () => {
    expect(run('0 12 * JAN-MAR *', 1)).toEqual([at(2027, 1, 1, 12, 0)])
  })

  it('月步进 */2：9 月已过 1 日，下一个是 11 月 1 日', () => {
    expect(run('0 12 1 */2 *', 1)).toEqual([at(2026, 11, 1, 12, 0)])
  })

  it('宏 @daily 为每天零点', () => {
    expect(run('@daily', 1)).toEqual([at(2026, 9, 18, 0, 0)])
  })

  it('范围步进 10-30/10 展开为 10、20、30 分', () => {
    expect(run('10-30/10 * * * *')).toEqual([
      at(2026, 9, 17, 12, 10),
      at(2026, 9, 17, 12, 20),
      at(2026, 9, 17, 12, 30),
    ])
  })

  it('非法表达式抛出带中文信息的 Error', () => {
    expect(() => getCronNextRuns('61 * * * *', ANCHOR, 1)).toThrow(/分钟/)
    expect(() => getCronNextRuns('* * * *', ANCHOR, 1)).toThrow(/字段数/)
  })
})
