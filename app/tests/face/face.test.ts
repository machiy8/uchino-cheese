// 顔の図形の照合：Python（face_parts.shapes()・to_svg()）の答え tests/golden/face_shapes.json と全件比べる
// 答えを作り直すとき：リポジトリ直下で python -I app/tools/export_faces.py
// node:fs を使うので src/ の外に置く（tsc -b の型チェックは src/ だけ）
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import golden from '../golden/face_shapes.json'
import facesGenerated from '../../src/data/generated/faces.json'
import styleGenerated from '../../src/data/generated/face_style.json'
import { faceStyle, speciesFaces } from '../../src/face/data'
import { FaceSvg } from '../../src/face/Face'
import { lineWidthFor, shapes } from '../../src/face/shapes'
import { roundHalfEven, toSvg } from '../../src/face/svg'
import { EXPRS, type Expr, type FaceItem } from '../../src/face/types'

const TOL = 0.01

interface GoldenCase {
  type: string
  expr: Expr
  lineWidth: number
  items: FaceItem[]
  svg: string
}
const cases = golden.cases as unknown as GoldenCase[]

function sha256(rel: string): string {
  return createHash('sha256')
    .update(readFileSync(new URL(`../../../${rel}`, import.meta.url)))
    .digest('hex')
}

/** 図形どうしの違い（無ければ null）。座標・線の太さは差 TOL 未満、それ以外は完全一致 */
function diff(got: FaceItem[], want: FaceItem[]): string | null {
  if (got.length !== want.length) return `図形の数 ${got.length}（答え ${want.length}）`
  for (let i = 0; i < want.length; i++) {
    const g = got[i]
    const w = want[i]
    if (g.kind !== w.kind || g.color !== w.color) return `#${i} の種類・色 ${g.kind} ${g.color}（答え ${w.kind} ${w.color}）`
    if (g.kind === 'fill' && w.kind === 'fill' && g.alpha !== w.alpha) return `#${i} の不透明度 ${g.alpha}（答え ${w.alpha}）`
    if (g.kind === 'stroke' && w.kind === 'stroke' && !(Math.abs(g.width - w.width) < TOL))
      return `#${i} の線の太さ ${g.width}（答え ${w.width}）`
    if (g.path.length !== w.path.length) return `#${i} のパスの長さ ${g.path.length}（答え ${w.path.length}）`
    for (let j = 0; j < w.path.length; j++) {
      const gc = g.path[j]
      const wc = w.path[j]
      if (gc[0] !== wc[0] || gc.length !== wc.length) return `#${i}.${j} の命令 ${gc[0]}（答え ${wc[0]}）`
      for (let k = 1; k < wc.length; k++) {
        const a = gc[k] as number
        const b = wc[k] as number
        if (!(Math.abs(a - b) < TOL)) return `#${i}.${j}[${k}] ${a}（答え ${b}）`
      }
    }
  }
  return null
}

describe('顔の書き出し', () => {
  it('答えと書き出しの元ファイルが今の art_tools と同じ（違えば export_faces.py を回し直す）', () => {
    const src = golden._export.sources as Record<string, string>
    for (const [rel, sha] of Object.entries(src)) expect(sha256(rel), rel).toBe(sha)
    expect(styleGenerated._export.sha256).toBe(sha256('art_tools/face_style.json'))
    expect(facesGenerated._export.sha256).toBe(sha256('art_tools/faces.json'))
  })

  it('88通り（8型×11表情）がそろっている', () => {
    expect(golden.types).toEqual(Object.keys(faceStyle.types))
    expect(golden.exprs).toEqual([...EXPRS])
    expect(cases).toHaveLength(8 * 11)
    expect(new Set(cases.map((c) => `${c.type}/${c.expr}`)).size).toBe(88)
  })

  it('82種の顔の型が face_style.json の型にある・線の太さが Python と同じ', () => {
    const ids = Object.keys(speciesFaces)
    expect(ids).toHaveLength(82)
    const want = golden.speciesLineWidth as Record<string, number>
    for (const id of ids) {
      const f = speciesFaces[id]
      expect(faceStyle.types[f.faceType], id).toBeDefined()
      expect(lineWidthFor(faceStyle, f.w), id).toBe(want[id])
    }
  })
})

describe.each(cases)('顔の図形 $type × $expr', (c) => {
  const got = shapes(c.type, c.expr, faceStyle, c.lineWidth)

  it('座標の差が0.01未満', () => {
    expect(diff(got, c.items)).toBeNull()
  })

  it('SVG が to_svg と同じ', () => {
    expect(toSvg(got, 1000, ` data-type="${c.type}" data-expr="${c.expr}"`)).toBe(c.svg)
  })
})

describe('表示用の部品', () => {
  // React は <path ...></path>、to_svg は <path .../> と閉じ方だけ違うので、属性の並びで比べる
  const pathsOf = (svg: string) => [...svg.matchAll(/<path ([^>]*?)\s*\/?>/g)].map((m) => m[1])

  it.each(cases.filter((c) => c.expr === 'normal' || c.expr === 'shy' || c.expr === 'cry'))(
    'FaceSvg の <path> が to_svg と同じ（$type × $expr）',
    (c) => {
      // 照合は顔の幅 400‰（線の太さ 32）のとき
      const html = renderToStaticMarkup(createElement(FaceSvg, { faceType: c.type, expr: c.expr, faceW: 400 }))
      expect(pathsOf(html)).toEqual(pathsOf(c.svg))
    },
  )
})

describe('数の丸め（Python の round と同じ）', () => {
  it('ちょうど .5 は偶数の側へ', () => {
    expect([0.5, 1.5, 2.5, -0.5, -1.5, 2.4999, 2.5001].map((v) => roundHalfEven(v) + 0)).toEqual([0, 2, 2, 0, -2, 2, 3])
  })
})
