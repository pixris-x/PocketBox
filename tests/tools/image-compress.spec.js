import { describe, expect, it } from 'vitest'
import {
  outputFilename,
  sizeChange,
} from '@/views/tools/image/components/CompressPanel/scripts/compressor'

describe('sizeChange', () => {
  it('变小 grew=false，percent 为节省幅度', () => {
    expect(sizeChange(1000, 250)).toEqual({ percent: 75, grew: false })
  })

  it('变大时 grew=true，能表达出来（common/utils/format 的 savingPercent 会夹成 0）', () => {
    expect(sizeChange(1000, 1200)).toEqual({ percent: 20, grew: true })
  })

  it('体积相同既不算变大也不算变小', () => {
    expect(sizeChange(1000, 1000)).toEqual({ percent: 0, grew: false })
  })

  it('原体积为 0 / 非法时返回 0 而非 Infinity 或 NaN', () => {
    expect(sizeChange(0, 100)).toEqual({ percent: 0, grew: false })
    expect(sizeChange(-5, 100)).toEqual({ percent: 0, grew: false })
    expect(sizeChange(Number.NaN, 100)).toEqual({ percent: 0, grew: false })
  })

  it('压到 0 字节（理论下界）是 100%', () => {
    expect(sizeChange(500, 0)).toEqual({ percent: 100, grew: false })
  })
})

describe('outputFilename', () => {
  it('替换扩展名并加 -compressed 后缀', () => {
    expect(outputFilename('photo.JPG', 'jpeg')).toBe('photo-compressed.jpg')
    expect(outputFilename('a.b.c.png', 'webp')).toBe('a.b.c-compressed.webp')
  })

  it('无扩展名也能工作', () => {
    expect(outputFilename('logo', 'webp')).toBe('logo-compressed.webp')
  })

  it('空文件名回落到 image', () => {
    expect(outputFilename('', 'jpeg')).toBe('image-compressed.jpg')
  })
})
