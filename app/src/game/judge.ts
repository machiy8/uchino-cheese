// 判定：仕込みの7つの入力と日付（月日）から、うまれる種を1つ決める
// zukan_tools/common.py の judge と同じ順：実在の完全一致（季節内）→ 失敗ルール（上から）→ 工房オリジナル（タイプ推定）
// 答えは Python が作る（app/tests/golden/judge_*.bin）。ここを手で合わせ直さない

import {
  SLOTS,
  speciesFile,
  type Cond,
  type FailSpecies,
  type MonthDay,
  type RealSpecies,
  type Recipe,
  type SeasonWindow,
  type Species,
  type When,
} from './zukan'

export function recipeKey(r: Recipe): string {
  return SLOTS.map((s) => String(r[s])).join('|')
}

/** 季節の窓に入っているか（両端を含む。年をまたぐ窓は from > to） */
export function inSeason(win: SeasonWindow | null, md: MonthDay): boolean {
  if (win === null) return true
  const v = md.month * 100 + md.day
  const a = win.from.month * 100 + win.from.day
  const c = win.to.month * 100 + win.to.day
  return a <= c ? a <= v && v <= c : v >= a || v <= c
}

function matchCond(cond: Cond, v: string | number): boolean {
  if (Array.isArray(cond)) return cond.includes(v)
  if (typeof cond === 'object') return !cond.not.includes(v)
  return v === cond
}

export function matchWhen(when: When, r: Recipe): boolean {
  for (const s of SLOTS) {
    const cond = when[s]
    if (cond !== undefined && !matchCond(cond, r[s])) return false
  }
  return true
}

const byId = new Map<string, Species>(speciesFile.species.map((s) => [s.id, s]))
const realByKey = new Map<string, RealSpecies[]>()
for (const s of speciesFile.species) {
  if (s.kind !== 'real') continue
  const k = recipeKey(s.recipe)
  const list = realByKey.get(k)
  if (list) list.push(s)
  else realByKey.set(k, [s])
}
const failRules: FailSpecies[] = speciesFile.species.filter((s): s is FailSpecies => s.kind === 'fail')

export function speciesById(id: string): Species {
  const s = byId.get(id)
  if (!s) throw new Error(`図鑑に無い ID: ${id}`)
  return s
}

export function judge(r: Recipe, md: MonthDay): Species {
  for (const s of realByKey.get(recipeKey(r)) ?? []) {
    if (inSeason(s.season, md)) return s
  }
  for (const f of failRules) {
    if (matchWhen(f.when, r)) return f
  }
  for (const rule of speciesFile.inferType) {
    if (matchWhen(rule.when, r)) return speciesById(rule.id)
  }
  // 書き出し時に最後の行は条件なしと確かめているので、ここには来ない
  throw new Error('タイプ推定の表が途中で終わっている')
}

/** ゲーム上の日付（time.ts の gameDay の 'YYYY-MM-DD'）から月日を取り出す */
export function monthDayOf(gameDay: string): MonthDay {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(gameDay)
  if (!m) throw new Error(`日付の形が違う: ${gameDay}`)
  return { month: Number(m[1]), day: Number(m[2]) }
}
