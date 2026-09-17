import { describe, it, expect } from 'vitest'
import { classifyQrText } from '@/common/utils/qr-text'

describe('classifyQrText', () => {
  it('http/https 链接识别为 url，大小写不敏感', () => {
    expect(classifyQrText('https://pocketbox.pixris.online/tool/qrcode')).toEqual({
      type: 'url',
      url: 'https://pocketbox.pixris.online/tool/qrcode',
    })
    expect(classifyQrText('HTTP://example.com/a?b=1').type).toBe('url')
  })

  it('完整 WIFI 分享码解析出 ssid / 密码 / 加密方式 / 隐藏标记', () => {
    const result = classifyQrText('WIFI:T:WPA;S:MyHome;P:p@ss;H:false;;')
    expect(result.type).toBe('wifi')
    expect(result.wifi).toEqual({
      ssid: 'MyHome',
      password: 'p@ss',
      encryption: 'WPA',
      hidden: false,
    })
  })

  it('WIFI 码缺字段时对应项为 null，缺 H 时 hidden 为 false', () => {
    const result = classifyQrText('WIFI:T:nopass;S:cafe;;')
    expect(result.wifi).toEqual({
      ssid: 'cafe',
      password: null,
      encryption: 'nopass',
      hidden: false,
    })
  })

  it('H:true 识别为隐藏网络，键名大小写不敏感', () => {
    const result = classifyQrText('wifi:t:WPA2;s:net;p:123;h:true;;')
    expect(result.wifi.hidden).toBe(true)
    expect(result.wifi.encryption).toBe('WPA2')
    expect(result.wifi.ssid).toBe('net')
  })

  it('含冒号密码按第一个冒号切分键值，其余归入值', () => {
    const result = classifyQrText('WIFI:T:WPA;S:s;P:a:b:c;;')
    expect(result.wifi.password).toBe('a:b:c')
  })

  it('其余文本按原文返回（保留首尾去空白）', () => {
    expect(classifyQrText('  会议时间：明天上午十点  ')).toEqual({
      type: 'text',
      text: '会议时间：明天上午十点',
    })
  })

  it('空串 / 纯空白 / 非字符串返回 empty', () => {
    expect(classifyQrText('')).toEqual({ type: 'empty' })
    expect(classifyQrText('   ')).toEqual({ type: 'empty' })
    expect(classifyQrText(null)).toEqual({ type: 'empty' })
    expect(classifyQrText(undefined)).toEqual({ type: 'empty' })
    expect(classifyQrText(12345)).toEqual({ type: 'empty' })
  })

  it('不是 http 开头的伪链接按普通文本处理', () => {
    expect(classifyQrText('ftp://files.example.com')).toEqual({
      type: 'text',
      text: 'ftp://files.example.com',
    })
    expect(classifyQrText('httpsx://broken').type).toBe('text')
  })
})
