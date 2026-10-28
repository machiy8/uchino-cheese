// 熟成棚 S3：3枠。空き→「仕込む」／熟成中→経過・いま取り出すと／あと◯で・なつき短縮・お手入れの回数・「お手入れ」「取り出す」
import { slotView } from '../game/cellar'
import { CARE_BUTTONS, type AgingSlot, type GameState } from '../game/state'
import { gameParams } from '../game/zukan'
import { formatMinutes, stageLabel } from './format'

interface Props {
  game: GameState
  now: number
  readOnly?: boolean
  onPrep: (slot: number) => void
  onCare: (slot: number) => void
  onHarvest: (slot: number) => void
}

export function inputSummary(a: AgingSlot): string {
  const i = a.input
  return [i.milk, i.bac, `圧搾${i.press}`, i.room, a.careLog['練る'] > 0 ? '練る' : ''].filter(Boolean).join('・')
}

export function CellarPage({ game, now, readOnly = false, onPrep, onCare, onHarvest }: Props) {
  const slots = Array.from({ length: gameParams.AGING_SLOTS }, (_, i) => i + 1)
  return (
    <section className="page" aria-labelledby="cellar-title">
      <h1 id="cellar-title" className="page-title">
        熟成棚
      </h1>
      <ol className="cellar">
        {slots.map((n) => {
          const a = game.aging.find((x) => x.slot === n)
          if (!a) {
            return (
              <li key={n} className="slot slot-empty" data-slot={n} data-state="empty">
                <div className="slot-head">
                  <span className="slot-no">枠{n}</span>
                  <span className="slot-status">空き</span>
                </div>
                <button type="button" className="btn btn-primary" disabled={readOnly} onClick={() => onPrep(n)}>
                  仕込む
                </button>
              </li>
            )
          }
          const v = slotView(a, now)
          return (
            <li key={n} className="slot" data-slot={n} data-state={v.stage ? 'ready' : 'aging'}>
              <div className="slot-head">
                <span className="slot-no">枠{n}</span>
                <span className="slot-input">{inputSummary(a)}</span>
              </div>
              <p className="slot-elapsed">経過 {formatMinutes(v.elapsedMin)}</p>
              {v.stage ? (
                <p className="slot-now">
                  いま取り出すと<strong>「{stageLabel(v.stage)}」</strong>
                </p>
              ) : (
                <p className="slot-now">まだ取り出せません</p>
              )}
              {v.next && (
                <p className="slot-next">
                  あと{formatMinutes(v.next.inMin)}で「{stageLabel(v.next.stage)}」
                </p>
              )}
              {v.boostPct > 0 && <p className="slot-boost">なつき短縮 −{v.boostPct}%</p>}
              <p className="slot-care">
                お手入れ {CARE_BUTTONS.map((c) => `${c}${a.careLog[c]}`).join('・')}
              </p>
              <div className="slot-actions">
                <button type="button" className="btn" disabled={readOnly} onClick={() => onCare(n)}>
                  お手入れ
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={readOnly || !v.stage}
                  onClick={() => onHarvest(n)}
                >
                  取り出す
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
