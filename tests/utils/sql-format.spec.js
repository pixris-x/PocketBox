import { describe, expect, it } from 'vitest'
import { formatSql, minifySql } from '@/common/utils/sql-format'

describe('formatSql 关键字与子句', () => {
  it('关键字大写并在主要子句前换行', () => {
    expect(formatSql('select a,b from t where a=1 and b=2')).toBe(
      'SELECT a, b\nFROM t\nWHERE a=1 AND b=2'
    )
  })

  it('JOIN 系列各自成行', () => {
    const result = formatSql('select * from a join b on a.id=b.id left join c on c.id=a.id')
    expect(result).toBe('SELECT *\nFROM a\nJOIN b ON a.id=b.id\nLEFT JOIN c ON c.id=a.id')
  })

  it('INSERT / VALUES 成行', () => {
    expect(formatSql('insert into t (a,b) values (1,2)')).toBe(
      'INSERT INTO t (a, b)\nVALUES (1, 2)'
    )
  })

  it('数据类型与建表关键字也大写', () => {
    const result = formatSql('create table t (id int not null, name varchar(20))')
    expect(result).toContain('CREATE TABLE')
    expect(result).toContain('INT')
    expect(result).toContain('NOT NULL')
    expect(result).toContain('VARCHAR')
  })

  it('非关键字标识符保持原样大小写', () => {
    expect(formatSql('select myColumn from MyTable')).toContain('myColumn')
    expect(formatSql('select myColumn from MyTable')).toContain('MyTable')
  })
})

describe('formatSql 字面量保护（最关键）', () => {
  it('单引号字符串内的关键字不动', () => {
    const result = formatSql("select 'order by' as x from t")
    expect(result).toContain("'order by'")
    expect(result).toContain('AS x')
  })

  it('行注释内的关键字不动', () => {
    const result = formatSql('select a from t -- select this comment\nwhere b=1')
    expect(result).toContain('-- select this comment')
  })

  it('块注释内的关键字不动', () => {
    const result = formatSql('select /* select from where */ 1')
    expect(result).toContain('/* select from where */')
  })

  it('双引号标识符内的关键字不动', () => {
    const result = formatSql('select "MyCol" from "MyTable"')
    expect(result).toContain('"MyCol"')
    expect(result).toContain('"MyTable"')
  })

  it('PostgreSQL 美元引号内的内容不动', () => {
    const result = formatSql('select $$select from$$ from t')
    expect(result).toContain('$$select from$$')
  })

  it('反引号标识符不动', () => {
    expect(formatSql('select `from` from t')).toContain('`from`')
  })

  it('字符串内的转义单引号不破坏解析', () => {
    const result = formatSql("select 'it''s here' from t")
    expect(result).toContain("'it''s here'")
  })
})

describe('formatSql 选项', () => {
  it('可关闭关键字大写', () => {
    expect(formatSql('select a from t', { uppercase: false })).toContain('select a')
  })

  it('可关闭换行', () => {
    expect(formatSql('select a from t where b=1', { breakLines: false })).not.toContain('\n')
  })

  it('缩进可切换为 Tab', () => {
    // 缩进在「跨段累积的括号深度」上生效：字面量会把代码段切开，
    // `IN (` 与子查询 SELECT 落在不同段时才能拿到 depth=1
    const result = formatSql("select a from t where x in ('a') and y in (select z from u)", {
      indent: 'tab',
    })
    expect(result).toContain('\t')
  })

  it('空输入返回空串', () => {
    expect(formatSql('')).toBe('')
    expect(formatSql('   ')).toBe('')
    expect(formatSql(null)).toBe('')
  })

  it('不改变括号结构', () => {
    const before = 'select count(*) from (select a from b) x'
    const after = formatSql(before)
    expect((after.match(/\(/g) || []).length).toBe((before.match(/\(/g) || []).length)
    expect((after.match(/\)/g) || []).length).toBe((before.match(/\)/g) || []).length)
  })
})

describe('minifySql 压缩', () => {
  it('多余空白被压成单行', () => {
    expect(minifySql('select   a ,   b  from    t')).toBe('select a , b from t')
  })

  it('字符串内的空格不能压', () => {
    // 压掉会改变字面量内容
    expect(minifySql("select a from t where x = 'a  b'")).toContain("'a  b'")
  })

  it('多行字符串不压成一行', () => {
    const result = minifySql('select $$line1\nline2$$ from t')
    expect(result).toContain('\n')
  })

  it('空输入返回空串', () => {
    expect(minifySql('')).toBe('')
  })
})
