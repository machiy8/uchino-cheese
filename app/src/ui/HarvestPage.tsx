// 取り出し S3c：仕上げを選ぶ（未解放は鍵つきで「図鑑◯種で解放」）→ 結果（体の絵＋顔・名前・種類・一言解説・はじめてなら「図鑑に登録」）
// 相棒がいなければ、取り出したチーズが相棒になる（結果に「相棒が生まれた」）。ヒントは W4
import { useState } from 'react'
import { isFinishUnlocked, slotView, type HarvestResult } from '../game/cellar'
import type { AgingSlot } from '../game/state'
import { gameParams, type Species, type TimeKey } from '../game/zukan'
import { CheeseFigure } from './CheeseFigure'
import { inputSummary } from './CellarPage'
import { kindLabel, ORIG_NOTE, stageLabel } from './format'

export function HarvestPage({
  aging,
  now,
  registeredCount,
  readOnly = false,
  note = null,
  onHarvest,
  onBack,
}: {
  aging: AgingSlot
  now: number
  registeredCount: number
  readOnly?: boolean
  /** 押したときに段階が変わっていた などの知らせ */
  note?: string | null
  /** shownStage＝押したときに画面に出ていた段（押した時刻の段と違えば確定しない） */
  onHarvest: (finish: string, shownStage: TimeKey | null) => void
  onBack: () => void
}) {
  const [finish, setFinish] = useState<string>('なし')
  const v = slotView(aging, now)
  const finishes = gameParams.domains.finish as string[]
  return (
    <section className="page sub" aria-labelledby="harvest-title">
      <header className="sub-head">
        <button type="button" className="btn" onClick={onBack}>
          ← 熟成棚
        </button>
        <span className="sub-head-note">
          枠{aging.slot}：{inputSummary(aging)}
        </span>
      </header>
      <h1 id="harvest-title" className="page-title">
        仕上げをえらぶ
      </h1>
      <p className="slot-now" data-stage={v.stage ?? ''}>
        {v.stage ? <>いま取り出すと「{stageLabel(v.stage)}」</> : 'まだ取り出せません'}
      </p>
      {note && (
        <p className="harvest-note" role="alert">
          {note}
        </p>
      )}
      <div className="choice-grid finish-grid">
        {finishes.map((f) => {
          const open = isFinishUnlocked(f, registeredCount)
          return (
            <button
              key={f}
              type="button"
              className="btn btn-choice"
              aria-pressed={finish === f}
              data-finish={f}
              data-locked={open ? undefined : 'true'}
              disabled={!open}
              onClick={() => setFinish(f)}
            >
              {open ? (
                f
              ) : (
                <>
                  <span aria-label="鍵">🔒</span> {f}
                  <span className="lock-note">図鑑{gameParams.FIN_UNLOCK[f]}種で解放</span>
                </>
              )}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-wide"
        disabled={readOnly || !v.stage}
        onClick={() => onHarvest(finish, v.stage)}
      >
        「{finish}」で取り出す
      </button>
    </section>
  )
}

/** 取り出した結果 */
export function HarvestResultView({
  result,
  onBack,
  onZukan,
  onBuddy,
}: {
  result: Pick<HarvestResult, 'species' | 'isNew' | 'recipe'> & { count: number; born?: boolean }
  onBack: () => void
  onZukan: () => void
  onBuddy?: () => void
}) {
  const s: Species = result.species
  return (
    <section className="page sub harvest-result" aria-labelledby="result-title" data-species={s.id} data-born={result.born ? 'true' : undefined}>
      {result.born && <p className="badge-new badge-born">相棒が生まれた！</p>}
      {result.isNew && <p className="badge-new">図鑑に登録</p>}
      <div className="result-figure">
        <CheeseFigure id={s.id} size="512" expr="smile" />
      </div>
      <h1 id="result-title" className="page-title">
        {s.name}
      </h1>
      <p className="result-kind">
        {kindLabel(s)}・{stageLabel(result.recipe.time)}・仕上げ「{result.recipe.finish}」
      </p>
      {s.kind !== 'orig' ? <p className="result-expl">{s.expl}</p> : <p className="result-expl">{ORIG_NOTE}</p>}
      <p className="note">作った回数 {result.count}回</p>
      {result.born && <p className="note">この子が、きょうから「うちの子」。相棒のタブで会えます。</p>}
      <div className="slot-actions">
        {result.born && onBuddy && (
          <button type="button" className="btn btn-primary" onClick={onBuddy}>
            相棒に会う
          </button>
        )}
        <button type="button" className="btn" onClick={onZukan}>
          図鑑を見る
        </button>
        <button type="button" className={result.born ? 'btn' : 'btn btn-primary'} onClick={onBack}>
          熟成棚へ
        </button>
      </div>
    </section>
  )
}
