// 相棒の姿：体の絵＋重ね絵（産毛 D1・ワイルド度 E1〜E3）＋SVG の顔を1枚の SVG に重ねる
// 重ね方は art_tools の extras_lib（overlay_tile・overlay_mass）と run_wild.py の値（計画 §6 #1・#5）：
// - D1・E1（散らす型）：絵の全体を体の外接矩形（faces.json の bbox）の長い辺×1.15（E1 は ×0.95 も）の正方形にして中央に置き、体の輪郭で切る
// - E2・E3（かたまり）：体の太い部分の矩形（bodyMain）×1.04 に合わせ、体の輪郭を 20px・40px（2048px の絵での値）広げた範囲で切る
// - 体の輪郭＝体の絵のアルファが 100/255 を超える所（extras_lib.mask_of）
// すね（計画 §6 #7）：体と重ね絵を左右反転し、顔は出さない
import { useId } from 'react'
import { assetUrl, assetVariant, bodyImage } from '../assets/catalog'
import { FaceGroup, speciesFaces, type Expr } from '../face'

/** うまれたて（1日目）の産毛 D1 の不透明度（0.5〜1.0 の1つの値。オーナーが実機で見て決める。決まったら face_style.json の overlay.down.opacity に戻す） */
export const DOWN_OPACITY = 0.7

/** extras_lib の値（2048px の絵でのピクセル。表示する絵の幅に合わせて縮める） */
const TILE_SIDE = 1.15
const E1_SCALE = 0.95
const MASS_COVER = 1.04
const MASS_GROW_PX_2048: Record<number, number> = { 2: 20, 3: 40 }
const SRC_PX = 2048

interface Props {
  id: string
  expr?: Expr
  /** すね：左右反転・顔なし */
  sulking?: boolean
  /** ワイルド度 0〜3 */
  wild?: number
  /** うまれたての産毛 */
  downy?: boolean
}

export function BuddyFigure({ id, expr = 'normal', sulking = false, wild = 0, downy = false }: Props) {
  const uid = useId().replace(/:/g, '')
  const body = bodyImage(id, '512')
  const f = speciesFaces[id]
  const w = body?.w ?? 1000
  const h = body?.h ?? 1000
  const k = w / 1000
  const kh = h / 1000
  const bb = f?.bbox ?? [0, 0, 1000, 1000]
  const bm = f?.bodyMain ?? bb
  const ov = (oid: string) => {
    const v = assetVariant('overlay', oid, '512')
    return v ? assetUrl(v) : null
  }

  /** 散らす型：体の外接矩形の中心に、長い辺×1.15×scale の正方形 */
  const tile = (scale: number) => {
    const L = bb[0] * k
    const T = bb[1] * kh
    const R = bb[2] * k
    const B = bb[3] * kh
    const side = Math.max(R - L, B - T) * scale * TILE_SIDE
    return { x: (L + R) / 2 - side / 2, y: (T + B) / 2 - side / 2, width: side, height: side }
  }
  /** かたまり：bodyMain×1.04（縦横それぞれ合わせる） */
  const mass = () => {
    const L = bm[0] * k
    const T = bm[1] * kh
    const R = bm[2] * k
    const B = bm[3] * kh
    const bw = (R - L) * MASS_COVER
    const bh = (B - T) * MASS_COVER
    return { x: (L + R) / 2 - bw / 2, y: (T + B) / 2 - bh / 2, width: bw, height: bh }
  }

  const down = downy ? ov('D1') : null
  const wildUrl = wild >= 1 ? ov(`E${Math.min(3, wild)}`) : null
  const grow = ((MASS_GROW_PX_2048[Math.min(3, wild)] ?? 0) * w) / SRC_PX
  const flip = sulking ? `translate(${w} 0) scale(-1 1)` : undefined
  const region = { x: 0, y: 0, width: w, height: h }
  const cls = ['buddy-figure', sulking ? 'buddy-figure-sulk' : ''].filter(Boolean).join(' ')

  return (
    <svg
      className={cls}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={sulking ? '後ろを向いている' : '相棒'}
      data-id={id}
      data-expr={sulking ? 'back' : expr}
      data-wild={wild}
      data-downy={downy ? 'true' : undefined}
    >
      {body && (down || wildUrl) && (
        <defs>
          <filter id={`${uid}-a`} filterUnits="userSpaceOnUse" {...region}>
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 0 0 0 1 1 1 1 1 1" />
            </feComponentTransfer>
          </filter>
          <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" {...region} style={{ maskType: 'alpha' }}>
            <image href={body.url} width={w} height={h} filter={`url(#${uid}-a)`} />
          </mask>
          {wild >= 2 && (
            <>
              <filter id={`${uid}-g`} filterUnits="userSpaceOnUse" {...region}>
                <feComponentTransfer>
                  <feFuncA type="discrete" tableValues="0 0 0 0 1 1 1 1 1 1" />
                </feComponentTransfer>
                <feMorphology operator="dilate" radius={grow} />
                <feGaussianBlur stdDeviation={grow / 4} />
              </filter>
              <mask id={`${uid}-mg`} maskUnits="userSpaceOnUse" {...region} style={{ maskType: 'alpha' }}>
                <image href={body.url} width={w} height={h} filter={`url(#${uid}-g)`} />
              </mask>
            </>
          )}
        </defs>
      )}
      <g transform={flip}>
        {body ? (
          <image href={body.url} width={w} height={h} />
        ) : (
          <rect x={4} y={4} width={w - 8} height={h - 8} fill="none" stroke="#d9b48c" strokeDasharray="12 8" />
        )}
        {body && down && (
          <image className="ov-down" href={down} {...tile(1)} opacity={DOWN_OPACITY} mask={`url(#${uid}-m)`} />
        )}
        {body && wildUrl && wild === 1 && <image className="ov-wild" href={wildUrl} {...tile(E1_SCALE)} mask={`url(#${uid}-m)`} />}
        {body && wildUrl && wild >= 2 && (
          <image className="ov-wild" href={wildUrl} {...mass()} preserveAspectRatio="none" mask={`url(#${uid}-mg)`} />
        )}
      </g>
      {f && !sulking && (
        <FaceGroup faceType={f.faceType} expr={expr} faceW={f.w} cx={f.cx} cy={f.cy} tilt={f.tilt} width={w} height={h} />
      )}
    </svg>
  )
}
