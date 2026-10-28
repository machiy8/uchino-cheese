// 設定 S8（W2 はデバッグの道具と版の表示だけ。通知・書き出し・クレジットなどは W5・W6）
import { useState } from 'react'
import { buildInfo } from '../buildInfo'
import { levelOf } from '../game/aging'
import { gameParams } from '../game/zukan'
import { formatMinutes } from './format'

const MIN = 60_000
export const ADVANCE_STEPS: { label: string; ms: number }[] = [
  { label: '＋30分', ms: 30 * MIN },
  { label: '＋3時間', ms: 180 * MIN },
  { label: '＋1日', ms: 1440 * MIN },
  { label: '＋7日', ms: 7 * 1440 * MIN },
]

export function SettingsPage({
  debug,
  affection,
  clockOffsetMs,
  readOnly = false,
  onAdvance,
  onResetClock,
  onLevel,
  onClearSave,
  onZukanCheck,
}: {
  debug: boolean
  affection: number
  clockOffsetMs: number
  readOnly?: boolean
  onAdvance: (ms: number) => void
  onResetClock: () => void
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
              <p>熟成棚と図鑑をすべて消して、はじめからにします。よろしいですか？</p>
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
