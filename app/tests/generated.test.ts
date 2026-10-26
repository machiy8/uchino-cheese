// 書き出した JSON どうしの食い違い（実装計画 §2-3：片方だけ古い、を防ぐ）

import { describe, expect, it } from 'vitest'
import hints from '../src/data/generated/hints.json'
import { gameParams, speciesFile } from '../src/game/zukan'

describe('書き出した JSON', () => {
  it('hints.json と species.json の data.py の sha256 が同じ', () => {
    expect(speciesFile.dataSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(hints.dataSha256).toBe(speciesFile.dataSha256)
  })

  it('82種の ID と No（r01〜r65・f66〜f74・o75〜o82）', () => {
    const sp = speciesFile.species
    expect(sp.length).toBe(82)
    sp.forEach((s, i) => {
      expect(s.no).toBe(i + 1)
      const prefix = s.kind === 'real' ? 'r' : s.kind === 'fail' ? 'f' : 'o'
      expect(s.id).toBe(prefix + String(s.no).padStart(2, '0'))
    })
    expect(sp.filter((s) => s.kind === 'real').length).toBe(65)
    expect(sp.filter((s) => s.kind === 'fail').length).toBe(9)
    expect(sp.filter((s) => s.kind === 'orig').length).toBe(8)
  })

  it('hints.json のカードと species.json の ID・名前・レシピが同じ', () => {
    const byId = new Map(speciesFile.species.map((s) => [s.id, s]))
    for (const c of hints.cards) {
      const s = byId.get(c.id)
      expect(s?.kind, c.id).toBe('real')
      if (s?.kind !== 'real') continue
      expect(s.name).toBe(c.name)
      expect(s.recipe).toEqual(c.recipe)
    }
    for (const c of hints.secretCards) expect(byId.get(c.id)?.name, c.id).toBe(c.name)
    expect(hints.cards.length + hints.secretCards.length).toBe(82)
  })

  it('チュートリアルとはじめてのレシピ帳のカードが図鑑にある実在種', () => {
    const real = new Set(speciesFile.species.filter((s) => s.kind === 'real').map((s) => s.id))
    expect(gameParams.tutorialCard).toBe('r01')
    expect(gameParams.starterCards.length).toBe(7)
    for (const id of gameParams.starterCards) expect(real.has(id), id).toBe(true)
  })
})
