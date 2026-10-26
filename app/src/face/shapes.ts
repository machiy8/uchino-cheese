// art_tools/face_parts.py の shapes() の移植。型×表情 → 図形の一覧（顔の中心(0,0)・顔の幅＝1000・右と下が正）
// 答えは Python 側が正本。式を直したくなったら face_parts.py を直して書き出し→照合テスト（tests/golden/face_shapes.json）
// Python の `a // b` は負の数でも切り捨て（floor）なので fd() で書く。演算の順も Python と同じにしてある
import type { BrowStyle, Expr, FaceItem, FaceStyle, FaceTypeStyle, Path, ShyStyle } from './types'

const K = 0.5523 // 円を4本の3次ベジェで近似する係数

/** Python の a // b（floor 除算） */
const fd = (a: number, b: number): number => Math.floor(a / b)

// ---------- 形の部品 ----------
export function ellipse(cx: number, cy: number, rx: number, ry: number): Path {
  return [
    ['M', cx + rx, cy],
    ['C', cx + rx, cy + ry * K, cx + rx * K, cy + ry, cx, cy + ry],
    ['C', cx - rx * K, cy + ry, cx - rx, cy + ry * K, cx - rx, cy],
    ['C', cx - rx, cy - ry * K, cx - rx * K, cy - ry, cx, cy - ry],
    ['C', cx + rx * K, cy - ry, cx + rx, cy - ry * K, cx + rx, cy],
    ['Z'],
  ]
}

/** 下半分の楕円（上を水平に切った目）。lid＝切る高さ（中心から下へ） */
export function lowerHalf(cx: number, cy: number, rx: number, ry: number, lid = 0): Path {
  const t = ry ? Math.min(Math.max(lid / ry, -0.95), 0.95) : 0
  const hx = rx * Math.sqrt(1 - t * t)
  const y0 = cy + lid
  return [
    ['M', cx - hx, y0],
    ['C', cx - hx, y0 + (ry - lid) * 1.25, cx + hx, y0 + (ry - lid) * 1.25, cx + hx, y0],
    ['Z'],
  ]
}

/** 弧（h>0 で下にふくらむ＝U、h<0 で上にふくらむ＝∩） */
export function arc(cx: number, cy: number, rx: number, h: number): Path {
  return [
    ['M', cx - rx, cy],
    ['Q', cx, cy + 2 * h, cx + rx, cy],
  ]
}

export function line(x1: number, y1: number, x2: number, y2: number): Path {
  return [
    ['M', x1, y1],
    ['L', x2, y2],
  ]
}

/** 4つ角のきらり（白） */
export function sparkle(cx: number, cy: number, r: number): Path {
  const k = r * 0.28
  return [
    ['M', cx, cy - r],
    ['Q', cx + k, cy - k, cx + r, cy],
    ['Q', cx + k, cy + k, cx, cy + r],
    ['Q', cx - k, cy + k, cx - r, cy],
    ['Q', cx - k, cy - k, cx, cy - r],
    ['Z'],
  ]
}

/** D形の開いた口（上が平ら） */
export function mouthOpen(cx: number, cy: number, rx: number, ry: number): Path {
  return [
    ['M', cx - rx, cy],
    ['C', cx - rx, cy + ry * 1.33, cx + rx, cy + ry * 1.33, cx + rx, cy],
    ['Z'],
  ]
}

/** 波線の口（泣き・点目の型の通常） */
export function wavy(cx: number, cy: number, rx: number, amp: number, n = 2): Path {
  const pts: Path = [['M', cx - rx, cy]]
  const seg = (2 * rx) / (2 * n)
  for (let i = 0; i < 2 * n; i++) {
    const x0 = cx - rx + seg * i
    pts.push(['Q', x0 + seg / 2, cy + (i % 2 === 0 ? amp : -amp), x0 + seg, cy])
  }
  return pts
}

/** ω の口（得意げ・ねむい） */
export function omega(cx: number, cy: number, rx: number, h: number): Path {
  return [
    ['M', cx - rx, cy - h * 0.3],
    ['Q', cx - rx / 2, cy + h * 1.6, cx, cy],
    ['Q', cx + rx / 2, cy + h * 1.6, cx + rx, cy - h * 0.3],
  ]
}

export function tear(cx: number, cy: number, r: number): Path {
  return [
    ['M', cx, cy - r * 1.4],
    ['C', cx + r * 0.2, cy - r * 0.6, cx + r, cy - r * 0.1, cx + r, cy + r * 0.4],
    ['C', cx + r, cy + r * 1.1, cx - r, cy + r * 1.1, cx - r, cy + r * 0.4],
    ['C', cx - r, cy - r * 0.1, cx - r * 0.2, cy - r * 0.6, cx, cy - r * 1.4],
    ['Z'],
  ]
}

// ---------- 型の基本形 ----------
/** shapes() の中で使う型の値（Python の t["_lw"] 等をまとめたもの） */
interface Ctx extends FaceTypeStyle {
  lw: number
  lineColor: string
  eyeColor: string
  hl: string
  cheekColor: string
  hatchColor: string
  mouthColor: string
  shy: ShyStyle
}

/** 型ごとの開いた目。sx＝左右（-1 左目・1 右目）。look＝黒目を横にずらす量（すねの横目） */
function eyeOpen(t: Ctx, sx: number, x: number, y: number, scale = 1.0, look = 0): FaceItem[] {
  const out: FaceItem[] = []
  const ec = t.eyeColor
  const hl = t.hl
  const st = t.eye
  const rx = st.rx * scale
  const ry = st.ry * scale
  const lid = st.lid ?? 0
  x += look
  if (st.shape === 'round' || st.shape === 'tall') {
    out.push({ kind: 'fill', path: ellipse(x, y, rx, ry), color: ec, alpha: 255 })
  } else if (st.shape === 'half') {
    // 半目（上まぶた）
    out.push({ kind: 'fill', path: lowerHalf(x, y, rx, ry, fd(-ry * lid, 1000)), color: ec, alpha: 255 })
  } else if (st.shape === 'dot') {
    out.push({ kind: 'fill', path: ellipse(x, y, rx, ry), color: ec, alpha: 255 })
  } else if (st.shape === 'itome') {
    // 糸目：ゆるい ∩ の線だけ
    out.push({ kind: 'stroke', path: arc(x, y, rx, -ry), width: t.lw, color: t.lineColor })
    return out
  }
  const hls = st.hl ?? 'one'
  if (hls === 'one') {
    out.push({ kind: 'fill', path: ellipse(x + rx * 0.32, y - ry * 0.34, rx * 0.34, ry * 0.34), color: hl, alpha: 255 })
  } else if (hls === 'two') {
    out.push({ kind: 'fill', path: ellipse(x + rx * 0.3, y - ry * 0.32, rx * 0.38, ry * 0.38), color: hl, alpha: 255 })
    out.push({ kind: 'fill', path: ellipse(x - rx * 0.34, y + ry * 0.4, rx * 0.16, ry * 0.16), color: hl, alpha: 255 })
  } else if (hls === 'wet') {
    // うるうる：大きな光＋下に横長の光
    out.push({ kind: 'fill', path: ellipse(x + rx * 0.28, y - ry * 0.3, rx * 0.42, ry * 0.42), color: hl, alpha: 255 })
    out.push({ kind: 'fill', path: ellipse(x - rx * 0.05, y + ry * 0.52, rx * 0.5, ry * 0.16), color: hl, alpha: 220 })
  } else if (hls === 'star') {
    out.push({ kind: 'fill', path: sparkle(x + rx * 0.22, y - ry * 0.25, rx * 0.62), color: hl, alpha: 255 })
    out.push({ kind: 'fill', path: ellipse(x - rx * 0.38, y + ry * 0.42, rx * 0.15, ry * 0.15), color: hl, alpha: 255 })
  } else if (hls === 'small') {
    out.push({ kind: 'fill', path: ellipse(x + rx * 0.3, y - ry * 0.3, rx * 0.28, ry * 0.28), color: hl, alpha: 255 })
  }
  if (st.shape === 'half') {
    // まぶたの線（型の目の幅より少し長く）
    const ly = y - fd(ry * lid, 1000)
    const tilt = st.lidTilt ?? 0 // ＋で外側が下がる（ねむそう）・−で外側が上がる（つり目）
    out.push({
      kind: 'stroke',
      path: line(x - sx * rx * 1.15, ly - tilt, x + sx * rx * 1.15, ly + tilt),
      width: t.lw,
      color: t.lineColor,
    })
  }
  if (st.lash) {
    // つり目の目じり（ツンデレ）
    out.push({
      kind: 'stroke',
      path: line(x + sx * rx * 0.55, y - ry * 0.95, x + sx * rx * 1.35, y - ry * 1.45),
      width: t.lw,
      color: t.lineColor,
    })
  }
  return out
}

type BrowMode = 'shy' | 'worry' | 'angry' | 'up' | null

/** 眉。mode：null＝型のまま／worry＝ハの字（内側が上）／angry＝逆ハ（内側が下）／up＝高く上げる／shy＝照れ */
function brows(t: Ctx, yShift = 0, mode: BrowMode = null): FaceItem[] {
  const b: BrowStyle | null = t.brow
  const gx = fd(t.eyeGap, 2)
  let by = t.eyeY - t.eye.ry - (b ? b.gap : 90) + yShift
  const w = b ? b.w : 110
  const lw = fd(t.lw * (b ? (b.thick ?? 1000) : 1000), 1000)
  let ang: number
  let curve: number
  if (mode === 'shy') {
    // 照れ：困り眉にしない（平ら〜少し上げる・つり眉は弱める）
    if (!b) return [] // 眉のない型は眉を足さない
    const sp = t.shy
    ang = Math.min(Math.max(b.angle, sp.browMinAngle), sp.browMaxAngle)
    curve = Math.min(b.curve ?? 0, sp.browCurve)
    by -= sp.browRaise
  } else if (mode === null) {
    if (!b) return []
    ang = b.angle // ＋で内側が上（ハの字）・−で内側が下（つり眉）
    curve = b.curve ?? 0
  } else {
    if (!b) ang = { worry: 70, angry: -70, up: 0 }[mode]
    else ang = { worry: Math.max(b.angle, 0) + 60, angry: Math.min(b.angle, 0) - 60, up: b.angle }[mode]
    curve = b ? (b.curve ?? 0) : -20
    if (mode === 'up') by -= 60
  }
  const out: FaceItem[] = []
  for (const sx of [-1, 1]) {
    const cx = sx * gx
    const xi = cx - fd(sx * w, 2) // 内側
    const xo = cx + fd(sx * w, 2) // 外側
    const yi = by - fd(ang, 2)
    const yo = by + fd(ang, 2)
    const p: Path = [
      ['M', xi, yi],
      ['Q', (xi + xo) / 2, (yi + yo) / 2 + curve, xo, yo],
    ]
    out.push({ kind: 'stroke', path: p, width: lw, color: t.lineColor })
  }
  return out
}

/** ほっぺ。shy＝照れ：大きく・濃く（face_style.json の exprShy）、斜線は4本 */
function cheeks(t: Ctx, extraAlpha = 0, hatch = false, puff = false, shy = false): FaceItem[] {
  const c = t.cheek
  const out: FaceItem[] = []
  const sp = t.shy
  for (const sx of [-1, 1]) {
    let x = sx * c.x
    let rx = fd(c.rx * (puff ? 1250 : 1000), 1000)
    let ry = c.ry
    if (shy) {
      rx = fd(c.rx * sp.cheekScaleX, 1000)
      ry = fd(c.ry * sp.cheekScaleY, 1000)
      x = sx * (c.x - sp.cheekInset)
    }
    const col = shy ? (sp.cheekColor ?? t.cheekColor) : t.cheekColor
    out.push({ kind: 'fill', path: ellipse(x, c.y, rx, ry), color: col, alpha: Math.min(255, c.alpha + extraAlpha) })
    if (hatch || c.hatch) {
      const idx = shy ? [-1.5, -0.5, 0.5, 1.5] : [-1, 0, 1]
      const step = shy ? rx * 0.3 : c.rx * 0.42
      for (const i of idx) {
        const hx = x + i * step
        out.push({
          kind: 'stroke',
          path: line(hx + 18, c.y - ry * 0.45, hx - 18, c.y + ry * 0.45),
          width: fd(t.lw * 6, 10),
          color: t.hatchColor,
        })
      }
    }
  }
  return out
}

function mouthNormal(t: Ctx, my: number): FaceItem[] {
  const m = t.mouth
  const lw = t.lw
  const lc = t.lineColor
  const s = m.shape
  const w = m.w
  const stroke = (path: Path): FaceItem => ({ kind: 'stroke', path, width: lw, color: lc })
  switch (s) {
    case 'u':
      return [stroke(arc(0, my, fd(w, 2), m.h ?? fd(w, 4)))]
    case 'wide':
      return [
        stroke([
          ['M', fd(-w, 2), my - 10],
          ['Q', 0, my + (m.h ?? 40) * 2, fd(w, 2), my - 10],
        ]),
      ]
    case 'open': {
      const p = mouthOpen(0, my - fd(w, 8), fd(w, 2), m.h ?? fd(w, 3))
      return [{ kind: 'fill', path: p, color: t.mouthColor, alpha: 255 }, stroke(p)]
    }
    case 'wavy':
      return [stroke(wavy(0, my, fd(w, 2), m.h ?? 22))]
    case 'he': // への字（ツンデレのむっ）
      return [stroke(arc(0, my + 10, fd(w, 2), -(m.h ?? 18)))]
    case 'flat':
      return [
        stroke([
          ['M', fd(-w, 2), my],
          ['Q', 0, my + (m.h ?? 12) * 2, fd(w, 2), my],
        ]),
      ]
    case 'omega':
      return [stroke(omega(0, my, fd(w, 2), m.h ?? 30))]
  }
  throw new Error(`口の形が分からない: ${s}`)
}

// ---------- 表情（型の変形） ----------
/** 型（style.types のキー）× 表情 の図形の一覧。lw＝線の太さ（顔の幅の千分率。lineWidthFor() で求める） */
export function shapes(faceType: string, expr: Expr, style: FaceStyle, lw: number): FaceItem[] {
  const base = style.types[faceType]
  if (!base) throw new Error(`顔の型が分からない: ${faceType}`)
  const t: Ctx = {
    ...base,
    lw,
    lineColor: style.lineColor,
    eyeColor: style.eyeColor,
    hl: style.highlightColor,
    cheekColor: style.cheekColor,
    hatchColor: style.cheekHatchColor ?? '#D9776B',
    mouthColor: style.mouthColor ?? '#964646',
    shy: style.exprShy,
  }
  const gx = fd(t.eyeGap, 2)
  const ey = t.eyeY
  const erx = t.eye.rx
  const ery = t.eye.ry
  const my = t.mouth.y
  const mw = t.mouth.w
  const lc = t.lineColor
  const stroke = (path: Path): FaceItem => ({ kind: 'stroke', path, width: lw, color: lc })
  const fill = (path: Path, color: string, alpha = 255): FaceItem => ({ kind: 'fill', path, color, alpha })
  const out: FaceItem[] = []
  // ほっぺ（いちばん下に描く）
  const extra: Partial<Record<Expr, number>> = { shy: t.shy.cheekAlphaAdd, smile: 30, proud: 20, cry: 30, sulk: 40 }
  out.push(...cheeks(t, extra[expr] ?? 0, expr === 'shy', expr === 'sulk', expr === 'shy'))
  const closedW = fd(Math.max(erx, 70) * 11, 10) // 閉じた目の幅（型の目の大きさを受け継ぐ）
  if (expr === 'normal' || expr === 'talk') {
    for (const sx of [-1, 1]) out.push(...eyeOpen(t, sx, sx * gx, ey))
    out.push(...brows(t))
  } else if (expr === 'smile') {
    // 目＝にっこり ∩
    for (const sx of [-1, 1]) out.push(stroke(arc(sx * gx, ey + fd(closedW, 4), closedW, fd(-closedW * 6, 10))))
    out.push(...brows(t, -20))
  } else if (expr === 'proud') {
    // 目＝半目（得意げに見下ろす）＋眉を上げる
    for (const sx of [-1, 1]) {
      const x = sx * gx
      const r = Math.max(erx, 60)
      const rv = Math.max(ery, 60)
      out.push(fill(lowerHalf(x, ey, r, rv, fd(rv * 2, 10)), t.eyeColor))
      out.push(stroke(line(x - r * 1.15, ey + rv * 0.2, x + r * 1.15, ey + rv * 0.2)))
    }
    out.push(...brows(t, 0, 'up'))
  } else if (expr === 'sulk') {
    // 目＝半目の横目・眉は寄せる
    for (const sx of [-1, 1]) {
      const x = sx * gx
      const r = Math.max(erx, 60)
      out.push(fill(lowerHalf(x + r * 0.35, ey, r * 0.8, r, fd(-r * 1, 10)), t.eyeColor))
      out.push(stroke(line(x - r * 1.1, ey - r * 0.12 + sx * 8, x + r * 1.1, ey - r * 0.12 - sx * 8)))
    }
    out.push(...brows(t, 20, 'angry'))
  } else if (expr === 'sleep' || expr === 'blink') {
    // 目＝閉じた U（ねむい）／ほぼ一直線（まばたき）
    for (const sx of [-1, 1]) {
      const h = expr === 'sleep' ? fd(closedW * 4, 10) : fd(closedW, 8)
      out.push(stroke(arc(sx * gx, ey + (expr === 'sleep' ? 20 : 0), closedW, h)))
    }
    out.push(...brows(t, expr === 'sleep' ? 25 : 0))
  } else if (expr === 'surprised') {
    for (const sx of [-1, 1]) {
      const r = fd(Math.max(erx, ery, 70) * 13, 10)
      const x = sx * gx
      out.push(fill(ellipse(x, ey, fd(r * 9, 10), r), t.eyeColor))
      out.push(fill(ellipse(x + r * 0.3, ey - r * 0.32, r * 0.3, r * 0.3), t.hl))
    }
    out.push(...brows(t, 0, 'up'))
  } else if (expr === 'cry') {
    // 目＝ぎゅっと閉じた ∩ ＋涙、眉はハの字
    for (const sx of [-1, 1]) {
      out.push(stroke(arc(sx * gx, ey, closedW, fd(-closedW * 4, 10))))
      out.push(
        fill(
          tear(sx * (gx + fd(closedW * 6, 10)), ey + closedW * 1.1, fd(Math.max(erx, 60) * 4, 10)),
          style.tearColor ?? '#8CC8F0',
          235,
        ),
      )
    }
    out.push(...brows(t, 10, 'worry'))
  } else if (expr === 'shy') {
    // 照れ：目線を横にそらす・眉は平ら〜少し上げ
    const sp = t.shy
    const look = fd(Math.max(erx, 40) * sp.lookPermille, 1000)
    for (const sx of [-1, 1]) out.push(...eyeOpen(t, sx, sx * gx, ey - sp.eyeLift, sp.eyeScale / 1000, look))
    out.push(...brows(t, 0, 'shy'))
  } else if (expr === 'sad') {
    for (const sx of [-1, 1]) out.push(...eyeOpen(t, sx, sx * gx, ey + 25, 0.92))
    out.push(...brows(t, 15, 'worry'))
  }
  // 口
  const mc = t.mouthColor
  if (expr === 'normal' || expr === 'blink') {
    out.push(...mouthNormal(t, my))
  } else if (expr === 'smile') {
    const r = fd(Math.max(mw, 150), 2)
    const p = mouthOpen(0, my - 10, r, fd(r * 7, 10))
    out.push(fill(p, mc), stroke(p))
  } else if (expr === 'talk') {
    const r = fd(Math.max(mw, 140) * 4, 10)
    const p = ellipse(0, my + 10, r, fd(r * 8, 10))
    out.push(fill(p, mc), stroke(p))
  } else if (expr === 'surprised') {
    const p = ellipse(0, my + 20, 55, 70)
    out.push(fill(p, mc), stroke(p))
  } else if (expr === 'proud') {
    out.push(stroke(omega(0, my, fd(Math.max(mw, 150), 2), 28)))
  } else if (expr === 'sulk') {
    // とがらせた口（小さな への字）
    out.push(stroke(arc(0, my + 15, 55, -22)))
  } else if (expr === 'sleep') {
    const p = ellipse(0, my + 15, 34, 30)
    out.push(fill(p, mc), stroke(p))
  } else if (expr === 'cry') {
    out.push(fill(mouthOpen(0, my + 40, 75, -60), mc), stroke(wavy(0, my + 10, 80, 18)))
  } else if (expr === 'shy') {
    // 小さな閉じた笑み（∪）。目線と同じ側へ少し寄せる
    const sp = t.shy
    out.push(stroke(arc(sp.mouthShift, my, fd(sp.mouthW, 2), sp.mouthH)))
  } else if (expr === 'sad') {
    out.push(stroke(arc(0, my + 30, fd(Math.max(mw, 120), 2), -35)))
  }
  return out
}

/**
 * 顔の線の太さ（顔の幅の千分率）。体の主線と同じ太さ＝ lineWidthImagePermille × 1000 ÷ 顔の幅 w（faces.json の w）
 * make_face_types.py と同じ整数の割り算（切り捨て）・最小1
 */
export function lineWidthFor(style: FaceStyle, faceW: number): number {
  return Math.max(1, fd(style.lineWidthImagePermille * 1000, faceW))
}
