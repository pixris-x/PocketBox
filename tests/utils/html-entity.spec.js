import { describe, expect, it } from 'vitest'
import {
  analyzeHtml,
  escapeHtml,
  escapeHtmlNonAscii,
  unescapeHtml,
  unknownEntities,
} from '@/common/utils/html-entity'

describe('escapeHtml', () => {
  it('转义五个保留字符', () => {
    expect(escapeHtml(`<div class="a">&'</div>`)).toBe(
      '&lt;div class=&quot;a&quot;&gt;&amp;&#39;&lt;/div&gt;'
    )
  })

  it('& 最先替换，已存在的实体不会被二次转义成 &amp;lt;', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('普通文本与中文原样保留', () => {
    expect(escapeHtml('普通文本 hello')).toBe('普通文本 hello')
  })

  it('空值安全', () => {
    expect(escapeHtml('')).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(null)).toBe('')
  })
})

describe('unescapeHtml — 数字实体', () => {
  it('十进制与十六进制', () => {
    expect(unescapeHtml('&#65;&#x42;')).toBe('AB')
    expect(unescapeHtml('&#20320;&#x597D;')).toBe('你好')
  })

  it('星平面码点（> 0xFFFF）正确合成代理对', () => {
    expect(unescapeHtml('&#128512;')).toBe('😀')
    expect(unescapeHtml('&#x1F600;')).toBe('😀')
  })

  it('超界与代理区码点原样保留，不产出乱码', () => {
    expect(unescapeHtml('&#x110000;')).toBe('&#x110000;')
    expect(unescapeHtml('&#xD800;')).toBe('&#xD800;')
  })

  it('十六进制大小写 X 都接受', () => {
    expect(unescapeHtml('&#X4C;')).toBe('L')
  })
})

describe('unescapeHtml — 命名实体', () => {
  it('五个 ASCII 保留实体', () => {
    expect(unescapeHtml('&amp;&lt;&gt;&quot;&apos;')).toBe(`&<>"'`)
  })

  it('ISO 8859-1 抽查（码点位置正确性）', () => {
    expect(unescapeHtml('&copy;')).toBe('©') // U+00A9
    expect(unescapeHtml('&nbsp;')).toBe(' ') // U+00A0
    expect(unescapeHtml('&yuml;')).toBe('ÿ') // U+00FF，Latin-1 最后一个
    expect(unescapeHtml('&iexcl;')).toBe('¡') // U+00A1，Latin-1 第一个
    expect(unescapeHtml('&szlig;')).toBe('ß')
    expect(unescapeHtml('&frac12;')).toBe('½')
  })

  it('希腊字母按码点顺序 zip（词终形与常规形不能错位）', () => {
    expect(unescapeHtml('&alpha;')).toBe('α') // U+03B1 起点
    expect(unescapeHtml('&omega;')).toBe('ω') // U+03C9 终点
    expect(unescapeHtml('&mu;')).toBe('μ')
    expect(unescapeHtml('&sigmav;')).toBe('ς') // U+03C2 词终
    expect(unescapeHtml('&sigma;')).toBe('σ') // U+03C3 常规
  })

  it('符号与箭头', () => {
    expect(unescapeHtml('&mdash;&ndash;&hellip;')).toBe('—–…')
    expect(unescapeHtml('&rarr;&infin;')).toBe('→∞')
  })

  it('HTML5 全大写写法可解', () => {
    expect(unescapeHtml('&AMP;&LT;')).toBe('&<')
  })

  it('未收录实体与缺分号写法原样保留（不吞字符）', () => {
    expect(unescapeHtml('&foo;')).toBe('&foo;')
    expect(unescapeHtml('&amp')).toBe('&amp')
    expect(unescapeHtml('&notanentity;')).toBe('&notanentity;')
  })
})

describe('escapeHtml / unescapeHtml 往返', () => {
  it('转义后可原样还原', () => {
    const cases = ['<a href="?x=1&y=2">Tom & Jerry\'s "tag"</a>', '中文 & 符号 < > "', '&&&&']
    for (const text of cases) expect(unescapeHtml(escapeHtml(text))).toBe(text)
  })

  it('每一个收录的命名实体都能解出非空字符（防空值映射吞掉正文）', () => {
    const names = [
      'amp',
      'lt',
      'gt',
      'quot',
      'apos',
      'nbsp',
      'copy',
      'reg',
      'trade',
      'deg',
      'micro',
      'middot',
      'bull',
      'hellip',
      'mdash',
      'ndash',
      'lsquo',
      'rsquo',
      'ldquo',
      'rdquo',
      'laquo',
      'raquo',
      'euro',
      'pound',
      'yen',
      'cent',
      'sect',
      'para',
      'plusmn',
      'times',
      'divide',
      'frac12',
      'sup1',
      'sup2',
      'sup3',
      'alpha',
      'beta',
      'gamma',
      'delta',
      'pi',
      'sigma',
      'sigmav',
      'omega',
      'larr',
      'rarr',
      'infin',
      'ne',
      'le',
      'ge',
      'radic',
      'sum',
      'hearts',
      'spades',
      'clubs',
      'diams',
      'check',
      'starf',
      'loz',
      'aacute',
      'eacute',
      'uuml',
      'ntilde',
      'Oslash',
      'oslash',
    ]
    for (const name of names) {
      const out = unescapeHtml(`&${name};`)
      expect(out, `实体 &${name}; 应被解码`).not.toBe(`&${name};`)
      expect(out.length, `实体 &${name}; 不应解成空串`).toBeGreaterThan(0)
    }
  })
})

describe('escapeHtmlNonAscii', () => {
  it('非 ASCII 全部转为数字实体，结果只含 ASCII', () => {
    const out = escapeHtmlNonAscii('你好 <b>»</b>')
    expect(out).toBe('&#20320;&#22909; &lt;b&gt;&#187;&lt;/b&gt;')
    expect([...out].every((ch) => ch.codePointAt(0) < 0x80)).toBe(true)
  })

  it('星平面字符用单个码点实体表示', () => {
    expect(escapeHtmlNonAscii('😀')).toBe('&#128512;')
    expect(unescapeHtml(escapeHtmlNonAscii('😀'))).toBe('😀')
  })
})

describe('unknownEntities', () => {
  it('只列出未识别的命名实体，跳过数字实体', () => {
    expect(unknownEntities('&amp; &foo; &#65; &Bar;')).toEqual(['&foo;', '&Bar;'])
  })

  it('全部可识别时返回空数组', () => {
    expect(unknownEntities('&amp;&copy;')).toEqual([])
  })
})

describe('analyzeHtml', () => {
  it('统计实体数与需转义字符数', () => {
    expect(analyzeHtml('&amp;&lt;a & b')).toEqual({ entities: 2, specials: 3 })
  })

  it('空串都是 0', () => {
    expect(analyzeHtml('')).toEqual({ entities: 0, specials: 0 })
  })
})
