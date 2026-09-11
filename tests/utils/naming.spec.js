import { describe, expect, it } from 'vitest'
import { NAMING_STYLES, convertAllNamings, convertNaming, splitWords } from '@/common/utils/naming'

describe('splitWords 拆词', () => {
  it('按分隔符拆分', () => {
    expect(splitWords('user_profile_name')).toEqual(['user', 'profile', 'name'])
    expect(splitWords('user-profile-name')).toEqual(['user', 'profile', 'name'])
    expect(splitWords('  foo.bar/baz qux  ')).toEqual(['foo', 'bar', 'baz', 'qux'])
  })

  it('按 camelCase 边界拆分', () => {
    expect(splitWords('userProfileName')).toEqual(['user', 'Profile', 'Name'])
    expect(splitWords('UserProfileName')).toEqual(['User', 'Profile', 'Name'])
  })

  it('拆开连续大写缩写', () => {
    expect(splitWords('HTTPServer')).toEqual(['HTTP', 'Server'])
    expect(splitWords('parseHTMLString')).toEqual(['parse', 'HTML', 'String'])
    expect(splitWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request'])
    expect(splitWords('fooBAR')).toEqual(['foo', 'BAR'])
    expect(splitWords('MAX_RETRY_COUNT')).toEqual(['MAX', 'RETRY', 'COUNT'])
  })

  it('字母与数字保持在同一个词内', () => {
    expect(splitWords('user2Name')).toEqual(['user2', 'Name'])
    expect(splitWords('utf8Encode')).toEqual(['utf8', 'Encode'])
  })

  it('中英混排在交界处断开', () => {
    expect(splitWords('用户Name')).toEqual(['用户', 'Name'])
    expect(splitWords('Name用户')).toEqual(['Name', '用户'])
  })

  it('空值与纯分隔符返回空数组', () => {
    expect(splitWords('')).toEqual([])
    expect(splitWords(null)).toEqual([])
    expect(splitWords('___')).toEqual([])
    expect(splitWords('   ')).toEqual([])
  })
})

describe('convertNaming 八种风格', () => {
  const input = 'user_profile_name'
  const expected = {
    camel: 'userProfileName',
    pascal: 'UserProfileName',
    snake: 'user_profile_name',
    constant: 'USER_PROFILE_NAME',
    kebab: 'user-profile-name',
    dot: 'user.profile.name',
    title: 'User Profile Name',
    space: 'user profile name',
  }

  it('声明了 8 种风格', () => {
    expect(NAMING_STYLES).toHaveLength(8)
  })

  for (const [id, value] of Object.entries(expected)) {
    it(`${id} 转换结果正确`, () => {
      expect(convertNaming(input, id)).toBe(value)
      const style = NAMING_STYLES.find((item) => item.id === id)
      expect(style, `NAMING_STYLES 中应存在 ${id}`).toBeTruthy()
    })
  }

  it('缩写在小写化后成为独立词', () => {
    expect(convertNaming('HTTPServer', 'snake')).toBe('http_server')
    expect(convertNaming('HTTPServer', 'camel')).toBe('httpServer')
    expect(convertNaming('parseHTMLString', 'kebab')).toBe('parse-html-string')
  })

  it('中文原样保留', () => {
    expect(convertNaming('用户Name', 'snake')).toBe('用户_name')
  })

  it('空输入返回空串', () => {
    expect(convertNaming('', 'camel')).toBe('')
  })

  it('未知风格返回原输入', () => {
    expect(convertNaming('a_b', 'nope')).toBe('a_b')
  })
})

describe('转换的幂等与往返一致性', () => {
  const input = 'user_profile_name'

  for (const style of NAMING_STYLES) {
    it(`${style.label} 二次转换结果不变`, () => {
      const once = convertNaming(input, style.id)
      expect(convertNaming(once, style.id)).toBe(once)
    })
  }

  it('kebab 结果再转 camel 与直接转一致', () => {
    expect(convertNaming(convertNaming(input, 'kebab'), 'camel')).toBe(
      convertNaming(input, 'camel')
    )
  })

  it('snake 结果再转 pascal 与直接转一致', () => {
    expect(convertNaming(convertNaming(input, 'snake'), 'pascal')).toBe(
      convertNaming(input, 'pascal')
    )
  })
})

describe('convertAllNamings', () => {
  it('返回全部 8 种风格', () => {
    const all = convertAllNamings('user_profile_name')
    expect(all).toHaveLength(8)
    expect(all.map((item) => item.id)).toEqual(NAMING_STYLES.map((item) => item.id))
    expect(all[0].value).toBe('userProfileName')
  })

  it('空输入时 8 条结果的值为空串', () => {
    const all = convertAllNamings('')
    expect(all).toHaveLength(8)
    expect(all.every((item) => item.value === '')).toBe(true)
  })
})
