import { describe, expect, it } from 'vitest'
import { DELIMITERS, csvToJson, findRaggedRows, jsonToCsv, parseCsvRows } from '@/common/utils/csv'

// 用两列 CSV 承载待测值：单列时空值行会被判为空行而跳过
const infer = (text) => csvToJson(`v,extra\n${text},x`, { inferTypes: true })[0].v

describe('parseCsvRows 底层解析', () => {
  it('产出二维数组', () => {
    expect(parseCsvRows('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('保留只含分隔符的行（不算空行）', () => {
    expect(parseCsvRows('a\n,\nb')).toEqual([['a'], ['', ''], ['b']])
  })

  it('文本以换行结尾时不产生多余空行', () => {
    expect(parseCsvRows('a,b\n')).toEqual([['a', 'b']])
  })
})

describe('csvToJson 基础解析', () => {
  it('有表头时首行作为字段名', () => {
    expect(csvToJson('name,age\n张三,28')).toEqual([{ name: '张三', age: '28' }])
  })

  it('无表头时字段名补为列N', () => {
    expect(csvToJson('a,b\n1,2', { hasHeader: false })).toEqual([
      { 列1: 'a', 列2: 'b' },
      { 列1: '1', 列2: '2' },
    ])
  })

  it('只有表头时没有数据行', () => {
    expect(csvToJson('a,b')).toEqual([])
  })

  it('单行在无表头模式下算一行数据', () => {
    expect(csvToJson('a,b', { hasHeader: false })).toEqual([{ 列1: 'a', 列2: 'b' }])
  })

  it('CRLF 归一化', () => {
    expect(csvToJson('a,b\r\n1,2', { hasHeader: false })).toEqual([
      { 列1: 'a', 列2: 'b' },
      { 列1: '1', 列2: '2' },
    ])
  })

  it('末尾换行不产生额外记录', () => {
    expect(csvToJson('a,b\n1,2\n', { hasHeader: false })).toHaveLength(2)
  })

  it('中间空字段保留为空串', () => {
    expect(csvToJson('a,b,c\n1,,3')).toEqual([{ a: '1', b: '', c: '3' }])
  })

  it('空输入与纯空白输入返回空数组', () => {
    expect(csvToJson('')).toEqual([])
    expect(csvToJson('   \n  ')).toEqual([])
  })

  it('空白行被跳过（回归：曾把空白行当数据）', () => {
    expect(csvToJson('a,b\n1,2\n\n3,4', { hasHeader: false })).toHaveLength(3)
    expect(csvToJson('a,b\n1,2\n   \n3,4', { hasHeader: false })).toHaveLength(3)
  })
})

describe('csvToJson 引号处理', () => {
  it('引号包裹的逗号不当分隔符', () => {
    expect(csvToJson('a,b\n"x,y",2')).toEqual([{ a: 'x,y', b: '2' }])
  })

  it('引号包裹的换行不断行', () => {
    expect(csvToJson('a,b\n"第1行\n第2行",2')).toEqual([{ a: '第1行\n第2行', b: '2' }])
  })

  it('连续两个双引号解析为一个双引号', () => {
    expect(csvToJson('a\n"say ""hi"""')).toEqual([{ a: 'say "hi"' }])
  })

  it('转义引号与逗号混用', () => {
    expect(csvToJson('a\n"""x"", y"')).toEqual([{ a: '"x", y' }])
  })

  it('引号包裹的分隔符本身', () => {
    expect(csvToJson('a,b\n"x,",2')).toEqual([{ a: 'x,', b: '2' }])
  })

  it('空引号字段为空串', () => {
    expect(csvToJson('a,b\n"",2')).toEqual([{ a: '', b: '2' }])
  })

  it('引号保护首尾空格', () => {
    expect(csvToJson('a,b\n" x ",2')).toEqual([{ a: ' x ', b: '2' }])
  })

  it('未加引号的普通文本照常解析', () => {
    expect(csvToJson('a,b\nplain,2')).toEqual([{ a: 'plain', b: '2' }])
  })
})

describe('csvToJson 分隔符', () => {
  it('声明了 4 种分隔符', () => {
    expect(DELIMITERS).toHaveLength(4)
  })

  it('制表符', () => {
    expect(csvToJson('a\tb\n1\t2', { delimiter: '\t', hasHeader: false })).toEqual([
      { 列1: 'a', 列2: 'b' },
      { 列1: '1', 列2: '2' },
    ])
  })

  it('分号', () => {
    expect(csvToJson('a;b\n"x;y";2', { delimiter: ';', hasHeader: false })).toEqual([
      { 列1: 'a', 列2: 'b' },
      { 列1: 'x;y', 列2: '2' },
    ])
  })

  it('逗号模式下分号是普通字符', () => {
    expect(csvToJson('x;y', { hasHeader: false })).toEqual([{ 列1: 'x;y' }])
  })
})

describe('csvToJson 表头处理', () => {
  it('表头去首尾空白', () => {
    expect(Object.keys(csvToJson(' a , b \n1,2')[0])).toEqual(['a', 'b'])
  })

  it('空表头补为列N', () => {
    expect(Object.keys(csvToJson(',b\n1,2')[0])).toEqual(['列1', 'b'])
  })

  it('重名表头追加序号去重', () => {
    expect(Object.keys(csvToJson('a,a,a\n1,2,3')[0])).toEqual(['a', 'a_2', 'a_3'])
  })

  it('超长行多出的列以列N命名而非丢弃', () => {
    expect(csvToJson('a,b\n1,2,3')).toEqual([{ a: '1', b: '2', 列3: '3' }])
  })

  it('短行缺失的列补空串', () => {
    expect(csvToJson('a,b,c\n1')).toEqual([{ a: '1', b: '', c: '' }])
  })
})

describe('csvToJson 类型推断', () => {
  it('整数 / 负数 / 小数 / 科学计数法', () => {
    expect(infer('42')).toBe(42)
    expect(infer('-7')).toBe(-7)
    expect(infer('3.14')).toBe(3.14)
    expect(infer('1e3')).toBe(1000)
    expect(infer('0')).toBe(0)
  })

  it('布尔与 null', () => {
    expect(infer('true')).toBe(true)
    expect(infer('false')).toBe(false)
    expect(infer('null')).toBe(null)
  })

  it('空值与普通文本保持原样', () => {
    expect(infer('')).toBe('')
    expect(infer('abc')).toBe('abc')
    expect(infer('1.2.3')).toBe('1.2.3')
  })

  it('保留前导零的串不转数字（手机号 / 邮编不被破坏）', () => {
    expect(infer('007')).toBe('007')
    expect(infer('013800000000')).toBe('013800000000')
  })

  it('关闭推断时全部为字符串', () => {
    expect(csvToJson('v\n42', { inferTypes: false })[0].v).toBe('42')
  })
})

describe('findRaggedRows 列数校验', () => {
  it('列数整齐时没有告警项', () => {
    expect(findRaggedRows('a,b\n1,2\n3,4')).toEqual({ width: 2, ragged: [] })
  })

  it('列数不齐时给出行号与列数', () => {
    expect(findRaggedRows('a,b\n1,2,3\n4')).toEqual({
      width: 2,
      ragged: [
        { line: 2, length: 3 },
        { line: 3, length: 1 },
      ],
    })
  })

  it('空输入返回宽度 0', () => {
    expect(findRaggedRows('')).toEqual({ width: 0, ragged: [] })
  })
})

describe('jsonToCsv', () => {
  it('对象数组', () => {
    expect(
      jsonToCsv([
        { name: '张三', age: 28 },
        { name: '李四', age: 35 },
      ])
    ).toBe('name,age\n张三,28\n李四,35')
  })

  it('键取并集，缺失值留空', () => {
    expect(jsonToCsv([{ a: 1 }, { b: 2 }])).toBe('a,b\n1,\n,2')
  })

  it('单个对象', () => {
    expect(jsonToCsv({ a: 1, b: 2 })).toBe('a,b\n1,2')
  })

  it('原始值数组归入 value 列', () => {
    expect(jsonToCsv([1, 2, 3])).toBe('value\n1\n2\n3')
  })

  it('空数组与 null 输入返回空串', () => {
    expect(jsonToCsv([])).toBe('')
    expect(jsonToCsv(null)).toBe('')
  })

  it('可不输出表头行', () => {
    expect(jsonToCsv([{ a: 1 }], { includeHeader: false })).toBe('1')
  })

  it('null 与 undefined 字段留空', () => {
    expect(jsonToCsv([{ a: null, b: undefined }])).toBe('a,b\n,')
  })

  it('布尔与数字按字面量输出', () => {
    expect(jsonToCsv([{ t: true, f: false, n: 0 }])).toBe('t,f,n\ntrue,false,0')
  })

  it('嵌套对象与数组序列化为 JSON 串', () => {
    expect(jsonToCsv([{ a: { x: 1 } }])).toBe('a\n"{""x"":1}"')
    expect(jsonToCsv([{ a: [1, 2] }])).toBe('a\n"[1,2]"')
  })

  it('值含逗号 / 引号 / 换行时按 RFC 规则转义', () => {
    expect(jsonToCsv([{ a: 'x,y' }])).toBe('a\n"x,y"')
    expect(jsonToCsv([{ a: 'say "hi"' }])).toBe('a\n"say ""hi"""')
    expect(jsonToCsv([{ a: 'l1\nl2' }])).toBe('a\n"l1\nl2"')
  })

  it('表头含分隔符时同样转义', () => {
    expect(jsonToCsv([{ 'a,b': 1 }])).toBe('"a,b"\n1')
  })

  it('指定制表符时逗号不再是分隔符', () => {
    expect(jsonToCsv([{ a: 'x,y' }], { delimiter: '\t' })).toBe('a\nx,y')
  })
})

describe('往返一致性（解析与生成互为逆运算）', () => {
  it('普通 CSV 转出再转回不走样', () => {
    const original = 'name,age,city\n张三,28,北京\n李四,35,上海'
    expect(jsonToCsv(csvToJson(original))).toBe(original)
  })

  it('值里带逗号 / 引号 / 换行也不失真', () => {
    const records = [
      { a: '含,逗号', b: '含"引号"', c: '含\n换行' },
      { a: '普通', b: '', c: 'x' },
    ]
    expect(csvToJson(jsonToCsv(records))).toEqual(records)
  })
})
