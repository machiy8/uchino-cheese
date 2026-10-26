// 絵の目録（public/assets/manifest.json）と図鑑の突き合わせ。82種すべてに体の 512px と 1024px があり、
// ファイルが実在し、sha256 が目録と一致する（目録に無い種があれば、画面は「絵なし」を出すがテストはここで落とす）
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assetManifest, bodyImage } from '../src/assets/catalog'
import { speciesFile } from '../src/game/zukan'
import { planAssets, readAssetManifest } from '../tools/precache-plan.mjs'

const assetsDir = new URL('../public/assets/', import.meta.url)
const sha256 = (u: URL) => createHash('sha256').update(readFileSync(u)).digest('hex')

describe('体の絵（82種）', () => {
  const ids = speciesFile.species.map((s) => s.id)

  it('species.json は82種', () => {
    expect(ids).toHaveLength(82)
  })

  it.each(['512', '1024'] as const)('%spx が82種すべて目録にあり、ファイルが実在し、sha256 が目録と一致する', (size) => {
    const missing: string[] = []
    const bad: string[] = []
    for (const id of ids) {
      const v = assetManifest.categories.body?.[id]?.variants[size]
      if (!v) {
        missing.push(`${id}（目録に無い）`)
        continue
      }
      const f = new URL(v.path, assetsDir)
      if (!existsSync(f)) missing.push(`${id}（${v.path} が無い）`)
      else if (sha256(f) !== v.sha256) bad.push(`${id}（${v.path}）`)
      expect(v.w, id).toBe(Number(size))
    }
    expect(missing, '体の絵が無い種').toEqual([])
    expect(bad, 'sha256 が目録と違う').toEqual([])
  })

  it('画面が使う URL は目録のパス＋内容の sha256 の先頭8文字', () => {
    const v = assetManifest.categories.body.r01.variants['512']
    expect(bodyImage('r01', '512')?.url).toMatch(new RegExp(`assets/${v.path}\\?v=${v.sha256.slice(0, 8)}$`))
    expect(bodyImage('x99', '512')).toBeNull()
  })
})

describe('PWA の先読みの分け方', () => {
  const plan = planAssets(readAssetManifest(new URL('manifest.json', assetsDir)))

  it('1024px・重ね絵 D2・vintage・vintage_face は外し、体の 512px 82枚は入れる', () => {
    expect(plan.include.filter((p) => p.includes('/1024/'))).toEqual([])
    expect(plan.include.filter((p) => /overlay\/.*D2|vintage/.test(p))).toEqual([])
    expect(plan.exclude).toContain('assets/overlay/512/D2.webp')
    expect(plan.include.filter((p) => p.startsWith('assets/body/512/'))).toHaveLength(82)
  })

  it('目録のファイルはどれも入れるか外すかのどちらか一方', () => {
    const all = Object.values(assetManifest.categories).flatMap((c) =>
      Object.values(c).flatMap((e) => Object.values(e.variants).map((v) => `assets/${v.path}`)),
    )
    expect([...plan.include, ...plan.exclude].sort()).toEqual([...all].sort())
    expect(plan.include.filter((p) => plan.exclude.includes(p))).toEqual([])
  })
})
