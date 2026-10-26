// art_tools/face_parts.py の to_svg() の移植。図形の一覧 → SVG の文字列（顔の幅＝size・中心＝(size/2, size/2)）
// 数の書き方まで Python と同じにする（座標は整数に丸める。Python の round は偶数への丸め）
import type { FaceItem, Path } from './types'

/** Python の int(round(v))（ちょうど .5 は偶数の側へ） */
export function roundHalfEven(v: number): number {
  const f = Math.floor(v)
  const d = v - f
  if (d > 0.5) return f + 1
  if (d < 0.5) return f
  return f % 2 === 0 ? f : f + 1
}

/** Python の str(int(round(v)))。-0 は "0" */
function num(v: number): string {
  const r = roundHalfEven(v)
  return String(r === 0 ? 0 : r)
}

/** Python の str(float)（整数になる値は "1.0" のように .0 をつける） */
function pyFloatStr(v: number): string {
  return Number.isInteger(v) ? `${v}.0` : String(v)
}

/** path → SVG の d 属性。offset＝座標に足す量（to_svg の size // 2） */
export function pathD(path: Path, offset: number): string {
  const d: string[] = []
  for (const cmd of path) {
    const [op, ...vals] = cmd
    if (op === 'Z') d.push('Z')
    else d.push(op + vals.map((v) => num(v + offset)).join(' '))
  }
  return d.join(' ')
}

/** 塗りの不透明度（0〜255 → fill-opacity の文字列。255 以上は undefined＝付けない） */
export function fillOpacity(alpha: number): string | undefined {
  return alpha >= 255 ? undefined : pyFloatStr(Math.floor((alpha * 1000) / 255) / 1000)
}

/** 線の太さの文字列（整数に丸める） */
export function strokeWidth(width: number): string {
  return num(width)
}

export function toSvg(items: FaceItem[], size = 1000, extraAttr = ''): string {
  const c = Math.floor(size / 2)
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"${extraAttr}>`]
  for (const it of items) {
    const dstr = pathD(it.path, c)
    if (it.kind === 'fill') {
      const op = fillOpacity(it.alpha)
      const opAttr = op === undefined ? '' : ` fill-opacity="${op}"`
      parts.push(`<path d="${dstr}" fill="${it.color}"${opAttr}/>`)
    } else {
      parts.push(
        `<path d="${dstr}" fill="none" stroke="${it.color}" stroke-width="${strokeWidth(it.width)}" ` +
          `stroke-linecap="round" stroke-linejoin="round"/>`,
      )
    }
  }
  parts.push('</svg>')
  return parts.join('\n')
}
