// 顔の数値（face_style.json）と図形の型。正本は art_tools/face_style.json・face_parts.py

export const EXPRS = [
  'normal',
  'smile',
  'shy',
  'sulk',
  'sleep',
  'surprised',
  'cry',
  'proud',
  'blink',
  'talk',
  'sad',
] as const
export type Expr = (typeof EXPRS)[number]

export const EXPR_JA: Record<Expr, string> = {
  normal: '通常',
  smile: '笑顔',
  shy: '照れ',
  sulk: 'すね',
  sleep: 'ねむい',
  surprised: '驚き',
  cry: '泣き',
  proud: '得意げ',
  blink: 'まばたき',
  talk: '口パク',
  sad: 'しょんぼり',
}

export interface EyeStyle {
  shape: string // round・tall・half・dot・itome
  rx: number
  ry: number
  hl?: string // one・two・wet・star・small
  lid?: number
  lidTilt?: number
  lash?: boolean
}

export interface BrowStyle {
  angle: number
  w: number
  gap: number
  curve?: number
  thick?: number
}

export interface MouthStyle {
  shape: string // u・wide・open・wavy・he・flat・omega
  w: number
  h?: number
  y: number
}

export interface CheekStyle {
  x: number
  y: number
  rx: number
  ry: number
  alpha: number
  hatch?: boolean
}

export interface FaceTypeStyle {
  ja: string
  eyeGap: number
  eyeY: number
  eye: EyeStyle
  brow: BrowStyle | null
  mouth: MouthStyle
  cheek: CheekStyle
}

export interface ShyStyle {
  browMinAngle: number
  browMaxAngle: number
  browRaise: number
  browCurve: number
  eyeScale: number
  eyeLift: number
  lookPermille: number
  mouthW: number
  mouthH: number
  mouthShift: number
  cheekScaleX: number
  cheekScaleY: number
  cheekInset: number
  cheekAlphaAdd: number
  cheekColor?: string
}

export interface FaceStyle {
  lineColor: string
  eyeColor: string
  highlightColor: string
  cheekColor: string
  cheekHatchColor?: string
  mouthColor?: string
  tearColor?: string
  lineWidthImagePermille: number
  exprShy: ShyStyle
  types: Record<string, FaceTypeStyle>
}

// path は face_parts.py と同じ形：["M",x,y]・["L",x,y]・["Q",cx,cy,x,y]・["C",c1x,c1y,c2x,c2y,x,y]・["Z"]
export type PathCmd =
  | ['M', number, number]
  | ['L', number, number]
  | ['Q', number, number, number, number]
  | ['C', number, number, number, number, number, number]
  | ['Z']
export type Path = PathCmd[]

export type FaceItem =
  | { kind: 'fill'; path: Path; color: string; alpha: number }
  | { kind: 'stroke'; path: Path; width: number; color: string }
