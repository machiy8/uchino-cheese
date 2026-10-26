// 絵の目録（public/assets/manifest.json・art_tools/export_app_assets.py の書き出し）から絵の場所を引く。
// パスは手で組み立てない。目録に無いものは null（画面は「絵なし」の枠を出す。テストでは落とす）
// 名前つきで読むと、使う categories だけがバンドルに入る
import { categories } from '../../public/assets/manifest.json'

export interface AssetVariant {
  path: string
  w: number
  h: number
  bytes: number
  sha256: string
}

interface AssetEntry {
  variants: Record<string, AssetVariant>
}

export interface AssetManifest {
  categories: Record<string, Record<string, AssetEntry>>
}

export const assetManifest: AssetManifest = { categories: categories as unknown as AssetManifest['categories'] }

export type BodySize = '512' | '1024'

export interface ImageRef {
  /** ページから読む URL。?v= に内容の sha256 の先頭8文字をつけ、絵を差し替えたら別のキャッシュになる（計画 §6 #16） */
  url: string
  w: number
  h: number
}

/** 目録の1件 → URL（public/assets/ からの相対パス・base は vite.config の './'） */
export function assetUrl(v: AssetVariant): string {
  return `${import.meta.env.BASE_URL}assets/${v.path}?v=${v.sha256.slice(0, 8)}`
}

export function assetVariant(category: string, id: string, size: string): AssetVariant | null {
  return assetManifest.categories[category]?.[id]?.variants[size] ?? null
}

/** 体の絵（512px＝一覧、1024px＝大きく見せるとき） */
export function bodyImage(id: string, size: BodySize): ImageRef | null {
  const v = assetVariant('body', id, size)
  return v ? { url: assetUrl(v), w: v.w, h: v.h } : null
}
