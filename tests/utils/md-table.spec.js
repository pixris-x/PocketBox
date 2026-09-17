import { describe, it, expect } from 'vitest'
import { csvToMarkdown } from '@/common/utils/md-table'

describe('csvToMarkdown', () => {
  it('首行作表头，默认左对齐', () => {
    expect(csvToMarkdown('name,age\n张三,20\n李四,30')).toBe(
      ['| name | age |', '| :--- | :--- |', '| 张三 | 20 |', '| 李四 | 30 |'].join('\n')
    )
  })

  it('对齐方式生成对应的分隔行', () => {
    const center = csvToMarkdown('a,b\n1,2', { align: 'center' })
    expect(center.split('\n')[1]).toBe('| :---: | :---: |')
    const right = csvToMarkdown('a,b\n1,2', { align: 'right' })
    expect(right.split('\n')[1]).toBe('| ---: | ---: |')
  })

  it('header=false 自动生成列1、列2 表头且所有行进表体', () => {
    expect(csvToMarkdown('a,b', { header: false })).toBe(
      ['| 列1 | 列2 |', '| :--- | :--- |', '| a | b |'].join('\n')
    )
  })

  it('单元格中的竖线转义、引号内换行转 <br>', () => {
    const csv = 'cmd,desc\ngrep,匹配"a|b"\nfmt,"多\n行"'
    const md = csvToMarkdown(csv)
    expect(md).toContain('匹配a\\|b')
    expect(md).toContain('多<br>行')
  })

  it('行长短于表头时补空单元格', () => {
    const md = csvToMarkdown('a,b,c\n1,2')
    expect(md.split('\n')[2]).toBe('| 1 | 2 |  |')
  })

  it('自定义分隔符', () => {
    expect(csvToMarkdown('a;b\n1;2', { delimiter: ';' }).split('\n')[0]).toBe('| a | b |')
  })

  it('空输入返回空串', () => {
    expect(csvToMarkdown('')).toBe('')
  })
})
