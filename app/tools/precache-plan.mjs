// PWA の先読み（precache）に入れる絵・外す絵を、絵の目録（public/assets/manifest.json）から決める。
// vite.config.ts（Workbox の設定）と tools/check_precache.mjs（build の最後の確認）の両方が使う
import { readFileSync } from 'node:fs'

/**
 * @typedef {{ path: string, bytes: number, sha256: string }} Variant
 * @typedef {{ categories: Record<string, Record<string, { variants: Record<string, Variant> }>> }} AssetManifest
 */

/** Phase1 で使わない絵（目録の区分 overlay.D2・vintage・vintageFace）。どのサイズも先読みしない */
export const UNUSED_IN_PHASE1 = [
  { category: 'overlay', id: 'D2' },
  { category: 'vintage', id: undefined },
  { category: 'vintageFace', id: undefined },
]

/** 1024px は先読みせず、使うときに保存（runtime cache）する */
export const LAZY_SIZE = '1024'

/** @param {string | URL} path @returns {AssetManifest} */
export function readAssetManifest(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

/**
 * 目録の全件を「入れる／外す」に分ける（パスは dist からの相対）。
 * 512px か1サイズしか無いものは入れる。1024px と Phase1 で使わない区分は外す
 * @param {AssetManifest} m
 * @returns {{ include: string[], exclude: string[] }}
 */
export function planAssets(m) {
  /** @type {string[]} */
  const include = []
  /** @type {string[]} */
  const exclude = []
  for (const [category, entries] of Object.entries(m.categories)) {
    for (const [id, entry] of Object.entries(entries)) {
      const unused = UNUSED_IN_PHASE1.some((u) => u.category === category && (u.id === undefined || u.id === id))
      for (const [size, v] of Object.entries(entry.variants)) {
        const p = `assets/${v.path}`
        if (unused || size === LAZY_SIZE) exclude.push(p)
        else include.push(p)
      }
    }
  }
  return { include, exclude }
}
