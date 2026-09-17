import { describe, it, expect } from 'vitest'
import {
  parseCurl,
  toAxios,
  toCurl,
  toFetch,
  toFetchFormData,
  toPython,
  tokenize,
} from '@/common/utils/curl'

describe('tokenize', () => {
  it('单引号原样保留、双引号内支持转义', () => {
    expect(tokenize(`a 'b c' "d \\"e\\""`)).toEqual(['a', 'b c', 'd "e"'])
  })

  it('反斜杠续行合并为一行', () => {
    expect(tokenize('curl \\\n  -X POST')).toEqual(['curl', '-X', 'POST'])
  })

  it('引号内的空白不切分，空引号也算一个 token', () => {
    expect(tokenize(`-H 'X: a b' ''`)).toEqual(['-H', 'X: a b', ''])
  })
})

describe('parseCurl', () => {
  it('典型 POST JSON：方法 / URL / 头 / 体', () => {
    const result = parseCurl(
      `curl -X POST https://api.example.com/v1/items -H 'Content-Type: application/json' -H "Authorization: Bearer abc" -d '{"name":"x"}'`
    )
    expect(result.ok).toBe(true)
    expect(result.request.method).toBe('POST')
    expect(result.request.url).toBe('https://api.example.com/v1/items')
    expect(result.request.headers).toEqual([
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Authorization', value: 'Bearer abc' },
    ])
    expect(result.request.body).toBe('{"name":"x"}')
  })

  it('无方法时按有无 body 推断 GET / POST', () => {
    expect(parseCurl('curl https://a.com').request.method).toBe('GET')
    expect(parseCurl(`curl https://a.com -d 'a=1'`).request.method).toBe('POST')
  })

  it('续行 + 混合引号 + 带空格 URL', () => {
    const command = [
      `curl 'https://example.com/search?q=a b' \\`,
      `  -H "X-Test: it's ok" \\`,
      `  -u user:pass`,
    ].join('\n')
    const { request } = parseCurl(command)
    expect(request.url).toBe('https://example.com/search?q=a b')
    expect(request.headers).toEqual([{ name: 'X-Test', value: "it's ok" }])
    expect(request.user).toBe('user:pass')
  })

  it('多个 -d 以 & 拼接；--data-raw 等价 -d', () => {
    expect(parseCurl('curl https://a.com -d a=1 -d b=2').request.body).toBe('a=1&b=2')
    expect(parseCurl('curl https://a.com --data-raw x=1').request.body).toBe('x=1')
  })

  it('-A / -e 转成标准请求头，-b 记录 cookie', () => {
    const { request } = parseCurl(
      `curl https://a.com -A 'MyAgent/1.0' -e 'https://ref.com' -b 'sid=1'`
    )
    expect(request.headers).toEqual([
      { name: 'User-Agent', value: 'MyAgent/1.0' },
      { name: 'Referer', value: 'https://ref.com' },
    ])
    expect(request.cookies).toBe('sid=1')
  })

  it('-I → HEAD；-G 强制 GET；--flag=value 写法', () => {
    expect(parseCurl('curl -I https://a.com').request.method).toBe('HEAD')
    expect(parseCurl('curl -G https://a.com -d x=1').request.method).toBe('GET')
    expect(parseCurl('curl --request=PUT https://a.com').request.method).toBe('PUT')
  })

  it('-F 解析表单字段', () => {
    const { request } = parseCurl(`curl https://a.com -F 'name=张三' -F 'avatar=@/tmp/a.png'`)
    expect(request.form).toEqual([
      { name: 'name', value: '张三' },
      { name: 'avatar', value: '@/tmp/a.png' },
    ])
    expect(request.method).toBe('POST')
  })

  it('错误场景：空命令 / 缺 URL / 非 http / 旗标缺参', () => {
    expect(parseCurl('').ok).toBe(false)
    expect(parseCurl('curl -X POST').error).toContain('URL')
    expect(parseCurl('curl ftp://a.com').error).toContain('http')
    expect(parseCurl('curl https://a.com -H').error).toContain('缺少参数')
  })
})

describe('代码生成', () => {
  const parsed = () =>
    parseCurl(
      `curl -X POST https://api.example.com/items -H 'Content-Type: application/json' -d '{"n":1}'`
    ).request

  it('fetch：方法 / 头 / body 原样保留', () => {
    const code = toFetch(parsed())
    expect(code).toContain("fetch('https://api.example.com/items', {")
    expect(code).toContain("method: 'POST',")
    expect(code).toContain("'Content-Type': 'application/json',")
    expect(code).toContain('body: {')
    expect(code).toContain('"n": 1')
  })

  it('GET 请求不输出 method 与 body', () => {
    const code = toFetch(parseCurl('curl https://a.com').request)
    expect(code).not.toContain('method:')
    expect(code).not.toContain('body:')
  })

  it('axios：JSON 体还原为对象字面量', () => {
    const code = toAxios(parsed())
    expect(code).toContain("method: 'post',")
    expect(code).toContain('data: {')
    expect(code).toContain('"n": 1')
  })

  it('Python：json= 用于 JSON 体，data= 用于表单体', () => {
    expect(toPython(parsed())).toContain('json=payload')
    const form = toPython(parseCurl(`curl https://a.com -d 'a=1'`).request)
    expect(form).toContain('data=payload')
    expect(form).toContain("'a=1'")
  })

  it('Python 字面量转换：null/布尔/嵌套', () => {
    const request = parseCurl(
      `curl https://a.com -H 'Content-Type: application/json' -d '{"a":null,"b":true,"c":[1,"x"]}'`
    ).request
    const code = toPython(request)
    expect(code).toContain("'a': None")
    expect(code).toContain("'b': True")
    expect(code).toContain("'c': [1, 'x']")
  })

  it('-u 生成 Basic 认证头（fetch / axios），Base64 正确', () => {
    const request = parseCurl('curl https://a.com -u user:pass').request
    const code = toFetch(request)
    // user:pass → dXNlcjpwYXNz
    expect(code).toContain('Basic dXNlcjpwYXNz')
  })

  it('-b 生成 Cookie 头', () => {
    const request = parseCurl('curl https://a.com -b "sid=1"').request
    expect(toFetch(request)).toContain("'Cookie': 'sid=1'")
  })

  it('FormData 骨架：去掉 Content-Type，附带 append', () => {
    const request = parseCurl(
      `curl https://a.com -F 'name=张三' -H 'Content-Type: multipart/form-data'`
    ).request
    const code = toFetchFormData(request)
    expect(code).toContain("form.append('name', '张三')")
    expect(code).not.toContain('Content-Type')
    expect(code).toContain('body: form,')
  })

  it('toCurl 生成的命令可被再次解析（往返等价）', () => {
    const original = parseCurl(
      `curl -X PUT https://a.com/x -H 'X-A: 1' -H 'X-B: two words' -d '{"k":"v"}'`
    ).request
    const regenerated = toCurl(original)
    const reparsed = parseCurl(regenerated)
    expect(reparsed.ok).toBe(true)
    expect(reparsed.request.method).toBe('PUT')
    expect(reparsed.request.url).toBe('https://a.com/x')
    expect(reparsed.request.body).toBe('{"k":"v"}')
    expect(reparsed.request.headers).toEqual([
      { name: 'X-A', value: '1' },
      { name: 'X-B', value: 'two words' },
    ])
  })
})
