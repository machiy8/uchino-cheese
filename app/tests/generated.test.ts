// 書き出した JSON どうしの食い違い（実装計画 §2-3：片方だけ古い、を防ぐ）

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import hints from '../src/data/generated/hints.json'
import ngWords from '../src/data/generated/ng_words.json'
import { gameParams, speciesFile } from '../src/game/zukan'

describe('書き出した JSON', () => {
  it('hints.json と species.json の data.py の sha256 が同じ', () => {
    expect(speciesFile.dataSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(hints.dataSha256).toBe(speciesFile.dataSha256)
  })

  it('書き出しの元（zukan_tools/data.py・common.py）が書き出したときから変わっていない', () => {
    const repo = new URL('../../', import.meta.url)
    const sha = (path: string) => createHash('sha256').update(readFileSync(new URL(path, repo))).digest('hex')
    const src = speciesFile.sourceSha256
    expect(Object.keys(src).sort()).toEqual(['zukan_tools/common.py', 'zukan_tools/data.py'])
    expect(src['zukan_tools/data.py']).toBe(speciesFile.dataSha256)
    const stale = Object.entries(src)
      .filter(([path, want]) => sha(path) !== want)
      .map(([path]) => path)
    expect(
      stale,
      `${stale.join('・')} が書き出した後に変わっている。リポジトリ直下で ` +
        'python -I app/tools/export_app_data.py --zukan zukan_tools --ng docs/specs/ng_words_v1.txt --out app/src/data/generated ' +
        'を回し直す',
    ).toEqual([])
    // NG語辞書も同じ。照合先は正本 docs/specs/ng_words_v1.txt に固定する（source から決めると、別のファイルから書き出したときに正本の変更に気づけない）
    expect(ngWords.source, 'ng_words.json が ng_words_v1.txt 以外から書き出されている').toBe('ng_words_v1.txt')
    expect(sha('docs/specs/ng_words_v1.txt'), 'ng_words_v1.txt が書き出した後に変わっている。export_app_data.py を回し直す').toBe(
      ngWords.sourceSha256,
    )
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
