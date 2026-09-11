import { describe, expect, it } from 'vitest'
import { CASE_MODES, SORT_MODES, applyCase, countText, processText } from '@/common/utils/text'

const SAMPLE = '  苹果\n香蕉\n\n苹果\n橙子\n  西瓜  '

const hasSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'

describe('processText 流水线', () => {
  it('只去首尾空白', () => {
    expect(processText(SAMPLE, { trimLines: true })).toBe('苹果\n香蕉\n\n苹果\n橙子\n西瓜')
  })

  it('去空白 + 去空行', () => {
    expect(processText(SAMPLE, { trimLines: true, removeEmptyLines: true })).toBe(
      '苹果\n香蕉\n苹果\n橙子\n西瓜'
    )
  })

  it('去空白 + 去空行 + 去重（保留首次出现）', () => {
    expect(
      processText(SAMPLE, { trimLines: true, removeEmptyLines: true, uniqueLines: true })
    ).toBe('苹果\n香蕉\n橙子\n西瓜')
  })

  it('不做任何处理时等于原文', () => {
    expect(processText(SAMPLE, {})).toBe(SAMPLE)
  })

  it('空输入与 null 返回空串', () => {
    expect(processText('', {})).toBe('')
    expect(processText(null, {})).toBe('')
  })

  it('纯空白行也算空行（回归：曾把空白行当数据）', () => {
    expect(processText('a\n   \nb', { removeEmptyLines: true })).toBe('a\nb')
  })

  it('大小写最后执行，作用于最终文本', () => {
    expect(processText('b\na\nb', { uniqueLines: true, sortMode: 'asc', caseMode: 'upper' })).toBe(
      'A\nB'
    )
  })

  it('输出统一以 \\n 连接（CRLF 归一化）', () => {
    expect(processText('a\r\nb', {})).toBe('a\nb')
  })

  it('是纯函数，不修改入参', () => {
    const lines = ['b', 'a']
    processText('b\na', { sortMode: 'asc' })
    expect(lines).toEqual(['b', 'a'])
  })
})

describe('processText 排序', () => {
  it('升序', () => {
    expect(processText('b\na\nc', { sortMode: 'asc' })).toBe('a\nb\nc')
  })

  it('降序', () => {
    expect(processText('b\na\nc', { sortMode: 'desc' })).toBe('c\nb\na')
  })

  it('按长度升序', () => {
    expect(processText('ccc\na\nbb', { sortMode: 'length-asc' })).toBe('a\nbb\nccc')
  })

  it('按长度降序', () => {
    expect(processText('ccc\na\nbb', { sortMode: 'length-desc' })).toBe('ccc\nbb\na')
  })

  it('未知排序方式保持原序', () => {
    expect(processText('b\na', { sortMode: 'nope' })).toBe('b\na')
  })
})

describe('applyCase', () => {
  it('全部大写（中文不受影响）', () => {
    expect(applyCase('abc 中文', 'upper')).toBe('ABC 中文')
  })

  it('全部小写', () => {
    expect(applyCase('ABC Def', 'lower')).toBe('abc def')
  })

  it('每个单词首字母大写', () => {
    expect(applyCase('hello world FOO', 'title')).toBe('Hello World Foo')
  })

  it('每句首字母大写（以 . ! ? 与中文句号等为边界）', () => {
    expect(applyCase('hello. world? yes! 中文', 'sentence')).toBe('Hello. World? Yes! 中文')
  })

  it('每行开头也算句子边界', () => {
    expect(applyCase('first line\nsecond line', 'sentence')).toBe('First line\nSecond line')
  })

  it('none 不改动原文本', () => {
    expect(applyCase('AbC', 'none')).toBe('AbC')
  })

  it('未知模式不改动原文本', () => {
    expect(applyCase('AbC', 'nope')).toBe('AbC')
  })
})

describe('countText 统计', () => {
  it('同时给出字符 / 不含空白字符 / 行 / 非空行 / 词数', () => {
    expect(countText('abc def\n中文测试')).toMatchObject({
      chars: 12,
      charsNoSpace: 10,
      lines: 2,
      nonEmptyLines: 2,
    })
  })

  it('空文本各项为 0', () => {
    expect(countText('')).toEqual({
      chars: 0,
      charsNoSpace: 0,
      lines: 0,
      nonEmptyLines: 0,
      words: 0,
    })
  })

  it('纯空白文本的非空行为 0', () => {
    expect(countText('   \n\n  ').nonEmptyLines).toBe(0)
  })

  it('按空白分词（拉丁文）', () => {
    expect(countText('one two three').words).toBe(3)
  })

  it.skipIf(!hasSegmenter)('中文按词切分而非整段算一个词', () => {
    expect(countText('中文测试').words).toBe(2)
  })
})

describe('选项常量', () => {
  it('大小写有 5 种模式，首项为保持原样', () => {
    expect(CASE_MODES).toHaveLength(5)
    expect(CASE_MODES[0].value).toBe('none')
  })

  it('排序有 5 种模式，首项为保持原序', () => {
    expect(SORT_MODES).toHaveLength(5)
    expect(SORT_MODES[0].value).toBe('none')
  })

  it('每项都含 label 与 value', () => {
    for (const mode of [...CASE_MODES, ...SORT_MODES]) {
      expect(mode.label).toBeTruthy()
      expect(mode.value).toBeTruthy()
    }
  })
})
