// 設定 S8（いまはデバッグの道具と版の表示だけ。通知・書き出し・クレジットなどは W5・W6）
import { useState } from 'react'
import { buildInfo } from '../buildInfo'
import { levelOf } from '../game/aging'
import type { BuddyState } from '../game/state'
import { gameParams, speciesFile } from '../game/zukan'
import { formatMinutes, pad2 } from './format'

const MIN = 60_000
export const ADVANCE_STEPS: { label: string; ms: number }[] = [
  { label: '＋30分', ms: 30 * MIN },
  { label: '＋3時間', ms: 180 * MIN },
  { label: '＋1日', ms: 1440 * MIN },
  { label: '＋7日', ms: 7 * 1440 * MIN },
]

/** 「最後の操作を◯時間前にする」のよく使う値（6時間＝機嫌が下がりはじめる・24＝すね・72/168/336＝ワイルド度1/2/3） */
export const LAST_OP_STEPS = [6, 24, 30, 72, 168, 336]

type BuddyValues = Partial<Pick<BuddyState, 'mood' | 'energy' | 'affection'>>

function BuddyDebug({
  buddy,
  readOnly,
  onSpecies,
  onValues,
  onLastInteraction,
}: {
  buddy: BuddyState
  readOnly: boolean
  onSpecies: (id: string) => void
  onValues: (v: BuddyValues) => void
  onLastInteraction: (hoursAgo: number) => void
}) {
  const [sp, setSp] = useState(buddy.speciesId ?? speciesFile.species[0].id)
  const [mood, setMood] = useState(String(buddy.mood))
  const [energy, setEnergy] = useState(String(buddy.energy))
  const [aff, setAff] = useState(String(buddy.affection))
  const [hours, setHours] = useState('30')
  const num = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s))
  const has = buddy.speciesId !== null
  return (
    <div className="buddy-debug" data-debug="buddy">
      <h3 className="debug-title">相棒</h3>
      <label className="debug-row">
        種
        <select value={sp} onChange={(e) => setSp(e.target.value)} data-debug-species="">
          {speciesFile.species.map((x) => (
            <option key={x.id} value={x.id}>
              No.{pad2(x.no)} {x.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-small" disabled={readOnly} onClick={() => onSpecies(sp)}>
          {has ? '選び直す' : '相棒にする'}
        </button>
      </label>
      <div className="debug-values">
        <label>
          機嫌
          <input type="number" min={0} max={100} value={mood} onChange={(e) => setMood(e.target.value)} data-debug-mood="" />
        </label>
        <label>
          元気
          <input type="number" min={10} max={100} value={energy} onChange={(e) => setEnergy(e.target.value)} data-debug-energy="" />
        </label>
        <label>
          なつき
          <input type="number" min={0} value={aff} onChange={(e) => setAff(e.target.value)} data-debug-affection="" />
        </label>
        <button
          type="button"
          className="btn btn-small"
          disabled={readOnly || !has}
          onClick={() => onValues({ mood: num(mood), energy: num(energy), affection: num(aff) })}
        >
          入れる
        </button>
      </div>
      <p className="note">
        いま：機嫌 {buddy.mood}・元気 {buddy.energy}・なつき {buddy.affection}・ワイルド度 {buddy.wild}
        {buddy.sulking ? '・すね' : ''}
        {buddy.sleep.isSleeping ? '・寝ている' : ''}
      </p>
      <p className="note">最後の操作を◯時間前にする（すね24・ワイルド度 72/168/336）</p>
      <div className="choice-grid debug-grid">
        {LAST_OP_STEPS.map((h) => (
          <button key={h} type="button" className="btn" data-last-op={h} disabled={readOnly || !has} onClick={() => onLastInteraction(h)}>
            {h}時間前
          </button>
        ))}
      </div>
      <div className="debug-values">
        <label>
          時間
          <input type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} data-debug-hours="" />
        </label>
        <button
          type="button"
          className="btn btn-small"
          disabled={readOnly || !has || num(hours) === undefined}
          onClick={() => onLastInteraction(num(hours) ?? 0)}
        >
          前にする
        </button>
      </div>
    </div>
  )
}

export function SettingsPage({
  debug,
  affection,
  buddy,
  clockOffsetMs,
  readOnly = false,
  onAdvance,
  onResetClock,
  onBuddySpecies = () => {},
  onBuddyValues = () => {},
  onBuddyLastInteraction = () => {},
  onLevel,
  onClearSave,
  onZukanCheck,
}: {
  debug: boolean
  affection: number
  buddy?: BuddyState
  clockOffsetMs: number
  readOnly?: boolean
  onAdvance: (ms: number) => void
  onResetClock: () => void
  onBuddySpecies?: (id: string) => void
  onBuddyValues?: (v: BuddyValues) => void
  onBuddyLastInteraction?: (hoursAgo: number) => void
  onLevel: (lv: number) => void
  onClearSave: () => void
  onZukanCheck: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const lv = levelOf(affection)
  return (
    <section className="page" aria-labelledby="settings-title">
      <h1 id="settings-title" className="page-title">
        設定
      </h1>
      {debug && (
        <div className="debug" data-debug="true">
          <h2 className="section-title">デバッグ（確認用の版だけ）</h2>

          <h3 className="debug-title">時間を進める</h3>
          <p className="note" data-clock-offset={clockOffsetMs}>
            {clockOffsetMs > 0 ? `いま ${formatMinutes(clockOffsetMs / MIN)} 進めています` : '進めていません'}
          </p>
          <div className="choice-grid debug-grid">
            {ADVANCE_STEPS.map((s) => (
              <button key={s.label} type="button" className="btn" data-advance={s.ms} onClick={() => onAdvance(s.ms)}>
                {s.label}
              </button>
            ))}
            <button type="button" className="btn" disabled={clockOffsetMs === 0} onClick={onResetClock}>
              元に戻す
            </button>
          </div>

          {buddy && (
            <BuddyDebug
              buddy={buddy}
              readOnly={readOnly}
              onSpecies={onBuddySpecies}
              onValues={onBuddyValues}
              onLastInteraction={onBuddyLastInteraction}
            />
          )}

          <h3 className="debug-title">なつき Lv</h3>
          <p className="note">
            いま Lv{lv}（なつき {affection}）。選ぶとその Lv のしきい値にする。熟成短縮は次に仕込んだ枠から
          </p>
          <div className="choice-grid level-grid">
            {gameParams.LV_TH.map((_, i) => (
              <button
                key={i}
                type="button"
                className="btn"
                aria-pressed={lv === i + 1}
                data-level={i + 1}
                disabled={readOnly}
                onClick={() => onLevel(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <h3 className="debug-title">セーブ</h3>
          {confirming ? (
            <div className="confirm-box" role="alertdialog" aria-label="セーブを消す">
              <p>相棒・熟成棚・図鑑をすべて消して、はじめからにします。よろしいですか？</p>
              <div className="slot-actions">
                <button type="button" className="btn" onClick={() => setConfirming(false)}>
                  やめる
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setConfirming(false)
                    onClearSave()
                  }}
                >
                  消す
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-danger" disabled={readOnly} onClick={() => setConfirming(true)}>
              セーブを消す
            </button>
          )}

          <h3 className="debug-title">確認用</h3>
          <button type="button" className="btn" onClick={onZukanCheck}>
            確認用の図鑑ページ（82種・11表情）
          </button>
        </div>
      )}
      <footer className="build-footer">
        版 <code>{buildInfo.commit}</code>・ビルド {buildInfo.builtAt}
      </footer>
    </section>
  )
}
