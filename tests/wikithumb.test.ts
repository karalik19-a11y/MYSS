import { describe, it, expect } from 'vitest'
import { wikiThumb } from '../src/lib/content-utils'
describe('wikiThumb', () => {
  it('оригинал -> превью', () => {
    expect(wikiThumb('https://upload.wikimedia.org/wikipedia/commons/0/0d/A_b.jpg', 640))
      .toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/A_b.jpg/640px-A_b.jpg')
  })
  it('меняет ширину у готового превью', () => {
    expect(wikiThumb('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/A.jpg/320px-A.jpg', 960))
      .toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/A.jpg/960px-A.jpg')
  })
  it('чужой домен не трогает', () => {
    expect(wikiThumb('https://example.com/a.jpg', 640)).toBe('https://example.com/a.jpg')
  })
  it('null', () => { expect(wikiThumb(null, 640)).toBeNull() })
})
