import { describe, it, expect } from 'vitest'
import { givenNameFrom } from '../givenName'

describe('givenNameFrom', () => {
  it("uses Google's given_name, never a guess from the full name", () => {
    expect(givenNameFrom({ name: '서자랑', given_name: '자랑', family_name: '서' })).toBe('자랑')
    expect(givenNameFrom({ name: 'Ada Lovelace', given_name: 'Ada' })).toBe('Ada')
  })

  it('gives undefined when the provider has no given name (GitHub), so the full name is used', () => {
    expect(givenNameFrom({ name: 'Jarang Seo', login: 'jarangseo' })).toBeUndefined()
    expect(givenNameFrom(undefined)).toBeUndefined()
    expect(givenNameFrom({ given_name: '   ' })).toBeUndefined()
    expect(givenNameFrom({ given_name: 42 })).toBeUndefined()
  })

  it('trims and bounds the value', () => {
    expect(givenNameFrom({ given_name: '  자랑 ' })).toBe('자랑')
    expect(givenNameFrom({ given_name: 'x'.repeat(80) })).toHaveLength(50)
  })
})
