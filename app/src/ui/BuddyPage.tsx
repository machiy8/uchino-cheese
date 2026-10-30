// ホーム S2（タブ「相棒」）：相棒の姿・機嫌の顔・ハートと Lv・いっしょに◯日目・元気・操作
// なでる＝体をタップ、ほかはボタン。上限・クールダウンのときは押した反応だけ（数値はそのまま、と短く出す）
// 名前・着せ替え・記念撮影は W6、ひらめきの吹き出しは W4
import { useEffect, useRef, useState } from 'react'
import { levelOf } from '../game/aging'
import {
  BP,
  buddySpecies,
  canWake,
  carePrefOf,
  isSleepWindow,
  moodFace,
  stageOf,
  type BuddyAction,
  type MoodFace,
  type OpResult,
} from '../game/buddy'
import { lineQuery, pickLine, reactionText, type LineScene } from '../game/lines'
import type { GameState } from '../game/state'
import { gameParams } from '../game/zukan'
import type { Expr } from '../face'
import { BuddyFigure } from './BuddyFigure'

/** 機嫌の顔5段階 → 顔の表情（face の EXPRS から選ぶ。PR に表で書く） */
export const MOOD_EXPR: Record<MoodFace, Expr> = {
  ごきげん: 'smile',
  にこにこ: 'proud',
  ふつう: 'normal',
  しょんぼり: 'sad',
  すねすね: 'sulk',
}

/** いまの顔：寝ている・元気30未満は「ねむい」、それ以外は機嫌の顔 */
export function buddyExpr(b: GameState['buddy']): Expr {
  if (b.sleep.isSleeping || b.energy < BP.ENERGY_SLEEPY_BELOW) return 'sleep'
  return MOOD_EXPR[moodFace(b.mood)]
}

/** 操作の直後だけ見せる顔 */
function flashExpr(r: OpResult, op: BuddyAction['op']): Expr | null {
  if (r.outcome !== 'effect') return null
  if (op === 'pet') return 'shy'
  if (op === 'talk') return 'talk'
  if (op === 'sun' && r.like === false) return 'surprised'
  if (op === 'sleep') return 'sleep'
  return 'smile'
}

const OP_SCENE: Record<BuddyAction['op'], LineScene> = {
  pet: 'pet',
  talk: 'talk',
  feed: 'feed',
  care: 'care',
  sleep: 'sleep',
  wake: 'wake',
  sun: 'sun',
}

/** 増えた分の書き方（機嫌+5・なつき+1 など） */
export function deltaText(d: OpResult['delta']): string {
  const parts: string[] = []
  if (d.mood) parts.push(`機嫌${d.mood > 0 ? '+' : ''}${d.mood}`)
  if (d.affection) parts.push(`なつき+${d.affection}`)
  if (d.energy) parts.push(`元気${d.energy > 0 ? '+' : ''}${d.energy}`)
  if (d.wild) parts.push(`ワイルド度${d.wild}`)
  return parts.join('・')
}

function waitText(sec: number): string {
  if (sec < 60) return `あと${sec}秒`
  const m = Math.ceil(sec / 60)
  return m < 60 ? `あと${m}分` : `あと${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}`
}

export interface Bubble {
  text: string
  /** 数値の変化（効果が付いたとき）か「数値はそのまま」 */
  note: string
  /** 効果が付いたか */
  effect: boolean
  /** 添える豆知識 */
  trivia?: string
}

/** 操作の結果 → 吹き出し。lastId は直前のセリフ（同じ行を続けない） */
export function bubbleOf(r: OpResult, action: BuddyAction, now: number, lastId: string | null, rng: () => number): Bubble & { lineId: string | null } {
  const sp = buddySpecies(r.state)!
  const b = r.state.buddy
  if (r.outcome === 'effect' || r.outcome === 'wildOnly') {
    let text: string
    let lineId: string | null = null
    if (r.outcome === 'wildOnly') text = reactionText(action.op, 'wildOnly')
    else if (action.op === 'sun' && r.like === false) text = reactionText('sun', `dislike.${action.kind}` as never)
    else {
      const l = pickLine(lineQuery(b, sp, OP_SCENE[action.op], now), lastId, rng)
      text = l?.text ?? '…'
      lineId = l?.id ?? null
    }
    const extra = [r.prefCare ? '好きなお手入れ！' : '', r.sulkCleared ? 'きげんが直った' : ''].filter(Boolean).join('・')
    return {
      text,
      note: [deltaText(r.delta), extra].filter(Boolean).join('・'),
      effect: true,
      trivia: action.op === 'sun' ? reactionText('sun', 'trivia' as never) : undefined,
      lineId,
    }
  }
  // 反応だけ（数値はそのまま）。すねている間に解く操作をしたら、すねのセリフ
  let text = reactionText(action.op, r.outcome)
  let lineId: string | null = null
  if (b.sulking && r.outcome !== 'sleeping') {
    const l = pickLine(lineQuery(b, sp, OP_SCENE[action.op], now), lastId, rng)
    if (l) {
      text = l.text
      lineId = l.id
    }
  }
  const wait = r.outcome === 'cooldown' && r.waitSec ? `（${waitText(r.waitSec)}）` : ''
  const sulk = r.wasSulking && b.sulking && b.sulkClear > 0 ? '・あと1回で直りそう' : ''
  return { text, note: `数値はそのまま${wait}${sulk}`, effect: false, lineId }
}

interface Props {
  game: GameState
  now: number
  readOnly?: boolean
  /** 操作する（結果を返す。操作できなければ null） */
  onAction: (a: BuddyAction) => OpResult | null
  onCellar: () => void
  /** 最初の吹き出し（テスト用） */
  initialBubble?: Bubble | null
}

export function BuddyPage({ game, now, readOnly = false, onAction, onCellar, initialBubble = null }: Props) {
  const [bubble, setBubble] = useState<Bubble | null>(initialBubble)
  const [flash, setFlash] = useState<Expr | null>(null)
  const lastLine = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const sp = buddySpecies(game)
  if (!sp) {
    return (
      <section className="page" aria-labelledby="buddy-title">
        <h1 id="buddy-title" className="page-title">
          相棒
        </h1>
        <div className="card placeholder-card buddy-none" data-buddy="none">
          <p>まだ相棒がいません</p>
          <p className="note">熟成棚で最初の1個を取り出すと、そのチーズが相棒として生まれます。</p>
          <button type="button" className="btn btn-primary" onClick={onCellar}>
            熟成棚へ
          </button>
        </div>
      </section>
    )
  }

  const b = game.buddy
  const lv = levelOf(b.affection)
  const nextTh = gameParams.LV_TH[lv]
  const stage = stageOf(b.daysTogether)
  const face = moodFace(b.mood)
  const sleeping = b.sleep.isSleeping
  const expr = flash ?? buddyExpr(b)

  const act = (a: BuddyAction) => {
    const r = onAction(a)
    if (!r) return
    const bub = bubbleOf(r, a, now, lastLine.current, Math.random)
    if (bub.lineId) lastLine.current = bub.lineId
    setBubble(bub)
    const fx = flashExpr(r, a.op)
    if (timer.current) clearTimeout(timer.current)
    setFlash(fx)
    if (fx) timer.current = setTimeout(() => setFlash(null), 1500)
  }

  const careLabel = { wipe: '塩水で拭く', turn: 'ひっくり返す' } as const
  const pref = carePrefOf(sp)

  return (
    <section
      className="page buddy-page"
      aria-labelledby="buddy-title"
      data-buddy={sp.id}
      data-sulking={b.sulking ? 'true' : undefined}
      data-sleeping={sleeping ? 'true' : undefined}
    >
      <header className="buddy-head">
        <h1 id="buddy-title" className="buddy-name">
          うちの子<span className="buddy-species">{sp.name}</span>
        </h1>
        <p className="buddy-days">
          いっしょに<strong data-days={b.daysTogether}>{b.daysTogether}</strong>日目・{BP.STAGE_JA[stage]}
        </p>
      </header>
      <dl className="buddy-stats">
        <div>
          <dt>なつき</dt>
          <dd data-affection={b.affection}>
            <span className="heart" aria-hidden="true">
              ♥
            </span>
            Lv{lv}
            <span className="stat-sub">
              {b.affection}
              {nextTh !== undefined ? `／次 ${nextTh}` : ''}
            </span>
          </dd>
        </div>
        <div>
          <dt>機嫌</dt>
          <dd data-mood={b.mood}>
            {b.sulking ? 'すねてる' : face}
            <span className="stat-sub">{b.mood}</span>
          </dd>
        </div>
        <div>
          <dt>元気</dt>
          <dd data-energy={b.energy}>
            <span className="energy-bar" aria-hidden="true">
              <span style={{ width: `${b.energy}%` }} />
            </span>
            <span className="stat-sub">{b.energy}</span>
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className="buddy-stage"
        aria-label="なでる"
        data-op="pet"
        disabled={readOnly}
        onClick={() => act({ op: 'pet' })}
      >
        <BuddyFigure id={sp.id} expr={expr} sulking={b.sulking} wild={b.wild} downy={stage === 'newborn'} />
        {sleeping && (
          <span className="zzz" aria-hidden="true">
            Zzz
          </span>
        )}
      </button>

      <div className="bubble" role="status" aria-live="polite">
        {bubble ? (
          <>
            <p className="bubble-text">{bubble.text}</p>
            <p className={bubble.effect ? 'bubble-note bubble-up' : 'bubble-note'}>{bubble.note}</p>
            {bubble.trivia && <p className="bubble-trivia">{bubble.trivia}</p>}
          </>
        ) : (
          <p className="bubble-text bubble-hint">
            {b.sulking ? '…（背中を向けている。なでたり話しかけたりしてみよう）' : sleeping ? 'すやすや…' : 'からだをタップしてなでよう'}
          </p>
        )}
      </div>

      <div className="buddy-ops">
        <button type="button" className="btn" data-op="talk" disabled={readOnly} onClick={() => act({ op: 'talk' })}>
          話しかける
        </button>
        <button type="button" className="btn" data-op="feed" disabled={readOnly} onClick={() => act({ op: 'feed' })}>
          ごはん
        </button>
        {sleeping ? (
          <button
            type="button"
            className="btn btn-primary"
            data-op="wake"
            data-ready={canWake(b, now) ? 'true' : undefined}
            disabled={readOnly}
            onClick={() => act({ op: 'wake' })}
          >
            おはよう
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            data-op="sleep"
            data-ready={isSleepWindow(now) ? 'true' : undefined}
            disabled={readOnly}
            onClick={() => act({ op: 'sleep' })}
          >
            寝かせる
          </button>
        )}
        {(['wipe', 'turn'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="btn"
            data-op="care"
            data-kind={k}
            disabled={readOnly}
            onClick={() => act({ op: 'care', kind: k })}
          >
            {careLabel[k]}
            {stage !== 'newborn' && k === pref && <span className="op-pref">好き</span>}
          </button>
        ))}
        <button type="button" className="btn" data-op="sun" data-kind="sun" disabled={readOnly} onClick={() => act({ op: 'sun', kind: 'sun' })}>
          日向ぼっこ
        </button>
        <button type="button" className="btn" data-op="sun" data-kind="cool" disabled={readOnly} onClick={() => act({ op: 'sun', kind: 'cool' })}>
          ひんやり
        </button>
      </div>
    </section>
  )
}

/** おかえり（24時間以上あいて戻った）。ホームの上に出す */
export function WelcomeModal({ affection, hint, text, onClose }: { affection: number; hint: boolean; text: string; onClose: () => void }) {
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="welcome-title" data-modal="welcome">
      <div className="modal">
        <h2 id="welcome-title" className="modal-title">
          おかえり
        </h2>
        <p className="modal-line">{text}</p>
        <p className="bubble-note bubble-up">再会ボーナス なつき+{affection}</p>
        {hint && <p className="note">待っているあいだに、何か見つけたみたい。</p>}
        <button type="button" className="btn btn-primary btn-wide" onClick={onClose}>
          ただいま
        </button>
      </div>
    </div>
  )
}
