// 確認用の図鑑ページの描画（react-dom/server）。一覧に82枚・名前が species.json と同じ／
// 詳細に11表情のボタン／表情ごとの顔の SVG が既存の svg 化（shapes → toSvg）と同じ
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EXPRS, EXPR_JA, faceStyle, lineWidthFor, shapes, speciesFaces, toSvg } from '../src/face'
import { speciesFile } from '../src/game/zukan'
import ZukanCheck, { CheeseFigure, ZukanDetail, zukanSpecies } from '../src/pages/ZukanCheck'

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")

// React は <path ...></path>、to_svg は <path .../> と閉じ方だけ違うので、属性の並びで比べる
const pathsOf = (svg: string) => [...svg.matchAll(/<path ([^>]*?)\s*\/?>/g)].map((m) => m[1])

describe('一覧', () => {
  const html = renderToStaticMarkup(createElement(ZukanCheck))
  const cards = [...html.matchAll(/data-card="([^"]+)"/g)].map((m) => m[1])
  const names = [...html.matchAll(/<span class="zukan-card-name">([^<]*)<\/span>/g)].map((m) => decode(m[1]))

  it('82枚が no 順で並び、名前が species.json と同じ', () => {
    const want = [...speciesFile.species].sort((a, b) => a.no - b.no)
    expect(cards).toEqual(want.map((s) => s.id))
    expect(names).toEqual(want.map((s) => s.name))
  })

  it('どのカードにも体の 512px（loading="lazy"）と顔がある・「絵なし」は無い', () => {
    const imgs = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0])
    expect(imgs).toHaveLength(82)
    for (const img of imgs) {
      expect(img).toContain('loading="lazy"')
      expect(img).toMatch(/src="[^"]*assets\/body\/512\/[a-z]\d{2}\.webp\?v=[0-9a-f]{8}"/)
    }
    expect([...html.matchAll(/class="figure-face"/g)]).toHaveLength(82)
    expect(html).not.toContain('絵なし')
  })

  it('画面の下に版（コミットID か local）とビルド日時', () => {
    expect(html).toMatch(/版 <code>([0-9a-f]{7}|local)<\/code>・ビルド \d{4}-\d{2}-\d{2} \d{2}:\d{2} JST/)
  })

  it('目録に絵が無い種は落ちずに「絵なし」の枠を出す', () => {
    const missing = renderToStaticMarkup(createElement(CheeseFigure, { id: 'x99', size: '512' }))
    expect(missing).toContain('絵なし')
    expect(missing).not.toContain('<img')
  })
})

describe('詳細', () => {
  it('ページから開いた詳細に11表情のボタン（日本語）と前後のボタン', () => {
    const html = renderToStaticMarkup(createElement(ZukanCheck, { initialId: 'r01' }))
    const labels = [...html.matchAll(/data-expr="[a-z]+"[^>]*>([^<]+)<\/button>/g)].map((m) => m[1])
    expect(labels).toEqual(EXPRS.map((e) => EXPR_JA[e]))
    expect(html).toContain('aria-pressed="true" data-expr="normal"')
    expect(html).toMatch(/assets\/body\/1024\/r01\.webp/)
    expect(html).toContain('No.02 →')
  })

  // 82種×11表情：詳細の顔の <path> が、その種の線の太さで svg 化（toSvg）したものと同じ
  it.each(zukanSpecies.map((s) => [s.id, s] as const))('%s の11表情の顔が svg 化の結果と同じ', (_id, s) => {
    const f = speciesFaces[s.id]
    const lw = lineWidthFor(faceStyle, f.w)
    for (const expr of EXPRS) {
      const html = renderToStaticMarkup(
        createElement(ZukanDetail, {
          species: s,
          expr,
          onExpr: () => {},
          prev: null,
          next: null,
          onMove: () => {},
          onClose: () => {},
        }),
      )
      const g = html.match(new RegExp(`<g transform="[^"]*" data-type="${f.faceType}" data-expr="${expr}">(.*?)</g>`))
      expect(g, `${s.id} ${expr}`).not.toBeNull()
      expect(pathsOf(g![1]), `${s.id} ${expr}`).toEqual(pathsOf(toSvg(shapes(f.faceType, expr, faceStyle, lw))))
      expect(html).toContain(`<dd>${lw}（${faceStyle.lineWidthImagePermille}×1000÷${f.w}）</dd>`)
    }
  })
})
