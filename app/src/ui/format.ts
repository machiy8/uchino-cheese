// 画面に出す言い方（時間・段階・種類）
import type { Species, TimeKey } from '../game/zukan'
import { gameParams } from '../game/zukan'

/** 分 → 「2日3時間5分」（0 の単位は書かない。全部 0 なら「0分」） */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.floor(min))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  const parts = [d ? `${d}日` : '', h ? `${h}時間` : '', mm ? `${mm}分` : ''].filter(Boolean)
  return parts.length ? parts.join('') : '0分'
}

/** 段階 → 「1日もの」 */
export function stageLabel(t: TimeKey): string {
  return `${gameParams.timeLabel[t]}もの`
}

const TYPE_JA = new Map(gameParams.types.map((t) => [t.id, t.ja]))

/** 種類の言い方（実在＝タイプ、失敗種、工房オリジナル） */
export function kindLabel(s: Species): string {
  if (s.kind === 'real') return TYPE_JA.get(s.type) ?? s.type
  if (s.kind === 'fail') return '失敗種'
  return `工房オリジナル（${TYPE_JA.get(s.type) ?? s.type}）`
}

/** 工房オリジナルに必ず添える注記 */
export const ORIG_NOTE = '工房オリジナルは、このゲームの中だけのチーズです（実在の銘柄ではありません）'

export const pad2 = (no: number) => String(no).padStart(2, '0')
