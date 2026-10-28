// 熟成短縮：なつき度 Lv による取り出しの窓のしきい値（分）
// zukan_tools/common.py の short_th と同じ：TH_MIN×(100−短縮%) // 100（分未満切り捨て・整数演算）
// 答えは app/tests/golden/boost_table.json（35個）

import { gameParams, TIME_KEYS, type TimeKey } from './zukan'

/** 短縮後のしきい値（分）。boostPct は 0〜100 の整数 */
export function shortThreshold(time: TimeKey, boostPct: number): number {
  if (!Number.isInteger(boostPct) || boostPct < 0 || boostPct > 100) {
    throw new Error(`短縮%は 0〜100 の整数: ${boostPct}`)
  }
  return Math.floor((gameParams.TH_MIN[time] * (100 - boostPct)) / 100)
}

/** 7段階すべての短縮後のしきい値（分） */
export function shortThresholds(boostPct: number): Record<TimeKey, number> {
  const out = {} as Record<TimeKey, number>
  for (const k of TIME_KEYS) out[k] = shortThreshold(k, boostPct)
  return out
}

/** なつき度 Lv（1〜10）の短縮%（common.BOOST_BY_LV） */
export function boostPctOfLevel(lv: number): number {
  const p = gameParams.BOOST_BY_LV[String(lv)]
  if (p === undefined) throw new Error(`なつき度 Lv は 1〜10: ${lv}`)
  return p
}

/** なつき度（累計）→ Lv（1〜10）。zukan_tools/common.py の level_of と同じ：しきい値 LV_TH 以上の最大の段 */
export function levelOf(affection: number): number {
  let lv = 1
  gameParams.LV_TH.forEach((t, i) => {
    if (affection >= t) lv = i + 1
  })
  return lv
}
