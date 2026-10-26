// build の最後に、PWA の先読み（precache）の一覧を確かめる（npm run build の中で走る）。
// 落とす条件：外すべきファイル（1024px・重ね絵 D2・vintage・vintage_face）が1つでも入っている／
// 図鑑82種の体の 512px がそろっていない／入れるべき絵（512px か1サイズのもの）が欠けている／先読みのファイルが dist に無い
// 最後に先読みの件数と合計バイト数を出す（PR に書く）
import { existsSync, readFileSync, statSync } from 'node:fs'
import { planAssets, readAssetManifest } from './precache-plan.mjs'

const app = new URL('../', import.meta.url)
const dist = new URL('dist/', app)
const manifest = readAssetManifest(new URL('public/assets/manifest.json', app))
const species = JSON.parse(readFileSync(new URL('src/data/generated/species.json', app), 'utf-8')).species

/** @type {string[]} */
const errors = []

// Workbox の sw.js に埋め込まれた先読みの一覧（{url:"…",revision:…}）を読む
const sw = readFileSync(new URL('sw.js', dist), 'utf-8')
const urls = [...sw.matchAll(/["']?url["']?\s*:\s*"([^"]+)"/g)].map((m) => m[1])
const precached = new Set(urls)
if (urls.length === 0) errors.push('sw.js から先読みの一覧が読めない')
if (precached.size !== urls.length) errors.push('先読みの一覧に同じファイルが重複している')

const plan = planAssets(manifest)
const excluded = plan.exclude.filter((p) => precached.has(p))
if (excluded.length) errors.push(`外すべきファイルが先読みに入っている（${excluded.length}件）：${excluded.slice(0, 10).join('・')}`)
const any1024 = urls.filter((u) => /(^|\/)1024\//.test(u))
if (any1024.length) errors.push(`1024px が先読みに入っている：${any1024.slice(0, 10).join('・')}`)

const body512 = species.map((/** @type {{id: string}} */ s) => {
  const v = manifest.categories.body?.[s.id]?.variants['512']
  return v ? `assets/${v.path}` : `（目録に無い：${s.id}）`
})
const bodyMissing = body512.filter((/** @type {string} */ p) => !precached.has(p))
if (species.length !== 82) errors.push(`species.json の種の数が ${species.length}（82 のはず）`)
if (bodyMissing.length) errors.push(`体の 512px が先読みにそろっていない（${82 - bodyMissing.length}/82）：${bodyMissing.slice(0, 10).join('・')}`)

const includeMissing = plan.include.filter((p) => !precached.has(p))
if (includeMissing.length)
  errors.push(`入れるべき絵が先読みに無い（${includeMissing.length}件）：${includeMissing.slice(0, 10).join('・')}`)

for (const need of ['index.html', 'manifest.webmanifest', 'assets/manifest.json'])
  if (!precached.has(need)) errors.push(`${need} が先読みに無い`)

let total = 0
let bodyBytes = 0
let assetBytes = 0
for (const u of urls) {
  const f = new URL(u, dist)
  if (!existsSync(f)) {
    errors.push(`先読みのファイルが dist に無い：${u}`)
    continue
  }
  const n = statSync(f).size
  total += n
  if (body512.includes(u)) bodyBytes += n
  else if (u.endsWith('.webp')) assetBytes += n
}

const kb = (/** @type {number} */ n) => `${n.toLocaleString('en-US')} バイト（${(n / 1024 / 1024).toFixed(2)} MiB）`
console.log(`先読み（precache）：${urls.length}件・合計 ${kb(total)}`)
console.log(`  体の 512px：82種中 ${82 - bodyMissing.length}枚・${kb(bodyBytes)}`)
console.log(`  そのほかの絵（アイコン・重ね絵・着せ替え・背景・UI）：${kb(assetBytes)}`)
console.log(`  アプリ本体ほか（JS・CSS・HTML・目録）：${kb(total - bodyBytes - assetBytes)}`)
console.log(`  外した絵：${plan.exclude.length}件（1024px・重ね絵 D2・vintage・vintage_face）`)

if (errors.length) {
  console.error('先読みの確認で止まりました：\n  ' + errors.join('\n  '))
  process.exit(1)
}
console.log('先読みの確認：OK')
