// 仕込み S3a：乳→菌→圧搾→熟成庫→練る の順に1つずつ選び、最後に確認して仕込む
// （「レシピどおりに仕込む」は W4。練るのミニゲームは W7）
import { useState } from 'react'
import type { PrepInput } from '../game/cellar'
import { gameParams } from '../game/zukan'

type Step = 'milk' | 'bac' | 'press' | 'room' | 'knead' | 'confirm'
const STEPS: Step[] = ['milk', 'bac', 'press', 'room', 'knead', 'confirm']

const STEP_TITLE: Record<Step, string> = {
  milk: '乳をえらぶ',
  bac: '菌をえらぶ',
  press: '圧搾（ぎゅっ）の回数',
  room: '熟成庫をえらぶ',
  knead: '練る？',
  confirm: 'これで仕込む？',
}

// 圧搾の言い方（分岐表 §1 の「0＝型に入れて水を切るだけ…」をゲームの言葉で）
const PRESS_NOTE = ['水を切るだけ', 'かるく', 'しっかり', '温めて強く']

type Draft = Partial<PrepInput>

export function PrepPage({
  slot,
  onDone,
  onCancel,
  initialStep = 'milk',
  initialDraft = {},
}: {
  slot: number
  onDone: (input: PrepInput) => void
  onCancel: () => void
  initialStep?: Step
  initialDraft?: Draft
}) {
  const [step, setStep] = useState<Step>(initialStep)
  const [draft, setDraft] = useState<Draft>(initialDraft)
  const idx = STEPS.indexOf(step)

  const pick = (patch: Draft) => {
    setDraft((d) => ({ ...d, ...patch }))
    setStep(STEPS[idx + 1])
  }
  const back = () => (idx === 0 ? onCancel() : setStep(STEPS[idx - 1]))

  const options = (() => {
    switch (step) {
      case 'milk':
        return (gameParams.domains.milk as string[]).map((v) => ({ key: v, label: v, sel: draft.milk === v, on: () => pick({ milk: v }) }))
      case 'bac':
        return (gameParams.domains.bac as string[]).map((v) => ({ key: v, label: v, sel: draft.bac === v, on: () => pick({ bac: v }) }))
      case 'press':
        return (gameParams.domains.press as number[]).map((v) => ({
          key: String(v),
          label: `${v}回（${PRESS_NOTE[v] ?? ''}）`,
          sel: draft.press === v,
          on: () => pick({ press: v }),
        }))
      case 'room':
        return (gameParams.domains.room as string[]).map((v) => ({ key: v, label: v, sel: draft.room === v, on: () => pick({ room: v }) }))
      case 'knead':
        return [
          { key: 'yes', label: '練る', sel: draft.knead === true, on: () => pick({ knead: true }) },
          { key: 'no', label: '練らない', sel: draft.knead === false, on: () => pick({ knead: false }) },
        ]
      default:
        return []
    }
  })()

  const ready =
    draft.milk !== undefined &&
    draft.bac !== undefined &&
    draft.press !== undefined &&
    draft.room !== undefined &&
    draft.knead !== undefined

  return (
    <section className="page sub" aria-labelledby="prep-title" data-step={step}>
      <header className="sub-head">
        <button type="button" className="btn" onClick={back}>
          ← {idx === 0 ? '熟成棚' : 'もどる'}
        </button>
        <span className="sub-head-note">
          枠{slot}に仕込む（{Math.min(idx + 1, 5)}/5）
        </span>
      </header>
      <h1 id="prep-title" className="page-title">
        {STEP_TITLE[step]}
      </h1>
      {step !== 'confirm' ? (
        <div className="choice-grid">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              className="btn btn-choice"
              aria-pressed={o.sel}
              data-choice={o.key}
              onClick={o.on}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <dl className="confirm-list">
            <dt>乳</dt>
            <dd>{draft.milk}</dd>
            <dt>菌</dt>
            <dd>{draft.bac}</dd>
            <dt>圧搾</dt>
            <dd>{draft.press}回</dd>
            <dt>熟成庫</dt>
            <dd>{draft.room}</dd>
            <dt>練る</dt>
            <dd>{draft.knead ? '練る' : '練らない'}</dd>
          </dl>
          <button
            type="button"
            className="btn btn-primary btn-wide"
            disabled={!ready}
            onClick={() => ready && onDone(draft as PrepInput)}
          >
            仕込む
          </button>
        </>
      )}
    </section>
  )
}
