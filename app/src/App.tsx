// 画面の骨組み：下のタブ4つ（相棒・熟成棚・図鑑・設定）とサブ画面（仕込み・お手入れ・取り出し・確認用の図鑑ページ）
// 遷移は実装計画 §1-2。Android の戻るボタンは W5
import { useEffect, useState } from 'react'
import { DEBUG_TOOLS } from './config'
import { addCare, harvest, startAging, type HarvestResult } from './game/cellar'
import { debugClockOffset } from './game/time'
import { gameParams } from './game/zukan'
import { speciesById } from './game/judge'
import ZukanCheck from './pages/ZukanCheck'
import {
  debugAdvance,
  debugClearSave,
  debugResetClock,
  dismissNotice,
  openScreen,
  openTab,
  play,
  tick,
  useApp,
  type AppState,
  type Tab,
} from './state/app'
import { CarePage } from './ui/CarePage'
import { CellarPage } from './ui/CellarPage'
import { HarvestPage, HarvestResultView } from './ui/HarvestPage'
import { PrepPage } from './ui/PrepPage'
import { SettingsPage } from './ui/SettingsPage'
import { ZukanEntry, ZukanPage } from './ui/ZukanPage'
import './ui/app.css'

const TABS: { id: Tab; label: string }[] = [
  { id: 'buddy', label: '相棒' },
  { id: 'cellar', label: '熟成棚' },
  { id: 'zukan', label: '図鑑' },
  { id: 'settings', label: '設定' },
]

/** 熟成棚の表示を進める間隔（経過・残り時間は分単位） */
const TICK_MS = 15_000

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="タブ">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="tab"
          aria-current={tab === t.id ? 'page' : undefined}
          data-tab={t.id}
          onClick={() => onTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}

export function BuddyPage() {
  return (
    <section className="page" aria-labelledby="buddy-title">
      <h1 id="buddy-title" className="page-title">
        相棒
      </h1>
      <div className="card placeholder-card">
        <p>準備中</p>
        <p className="note">うちの子との暮らしは、もうすぐはじまります。</p>
      </div>
    </section>
  )
}

type Result = Pick<HarvestResult, 'species' | 'isNew' | 'recipe'> & { count: number }

export default function App() {
  return <AppShell {...useApp()} />
}

/** 状態を受け取って描く本体（react-dom/server のテストはここを描く） */
export function AppShell({ phase, game, readOnly, notice, clock, tab, screen }: AppState) {
  const [result, setResult] = useState<Result | null>(null)
  const [entryId, setEntryId] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(tick, TICK_MS)
    // 裏から戻ったらすぐ「いま」を写す
    const onVis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  if (phase === 'loading') {
    return (
      <main className="app-shell">
        <p className="loading">読み込み中…</p>
      </main>
    )
  }

  const backToCellar = () => openScreen(null)
  const slotAging = screen && 'slot' in screen ? game.aging.find((a) => a.slot === screen.slot) : undefined

  let body
  if (result) {
    body = (
      <HarvestResultView
        result={result}
        onBack={() => {
          setResult(null)
          openTab('cellar')
        }}
        onZukan={() => {
          setResult(null)
          openTab('zukan')
        }}
      />
    )
  } else if (screen?.kind === 'prep') {
    body = (
      <PrepPage
        slot={screen.slot}
        onCancel={backToCellar}
        onDone={(input) => {
          play((g, t) => startAging(g, input, t, screen.slot))
          backToCellar()
        }}
      />
    )
  } else if (screen?.kind === 'care' && slotAging) {
    body = (
      <CarePage
        aging={slotAging}
        readOnly={readOnly}
        onBack={backToCellar}
        onCare={(c) => play((g) => addCare(g, screen.slot, c))}
      />
    )
  } else if (screen?.kind === 'harvest' && slotAging) {
    body = (
      <HarvestPage
        aging={slotAging}
        now={clock}
        registeredCount={Object.keys(game.zukan.registered).length}
        readOnly={readOnly}
        onBack={backToCellar}
        onHarvest={(finish) => {
          let r: HarvestResult | null = null
          play((g, t) => {
            r = harvest(g, screen.slot, finish, t)
            return r.state
          })
          const got = r as HarvestResult | null
          if (got) {
            setResult({ species: got.species, isNew: got.isNew, recipe: got.recipe, count: got.state.zukan.registered[got.species.id].count })
            openScreen(null)
          }
        }}
      />
    )
  } else if (screen?.kind === 'zukanCheck') {
    body = (
      <div className="sub-full">
        <header className="sub-head sub-head-pad">
          <button type="button" className="btn" onClick={() => openScreen(null)}>
            ← 設定
          </button>
        </header>
        <ZukanCheck />
      </div>
    )
  } else if (tab === 'buddy') {
    body = <BuddyPage />
  } else if (tab === 'cellar') {
    body = (
      <CellarPage
        game={game}
        now={clock}
        readOnly={readOnly}
        onPrep={(slot) => openScreen({ kind: 'prep', slot })}
        onCare={(slot) => openScreen({ kind: 'care', slot })}
        onHarvest={(slot) => openScreen({ kind: 'harvest', slot })}
      />
    )
  } else if (tab === 'zukan') {
    body = <ZukanPage registered={game.zukan.registered} onOpen={setEntryId} />
  } else {
    body = (
      <SettingsPage
        debug={DEBUG_TOOLS}
        affection={game.buddy.affection}
        clockOffsetMs={debugClockOffset()}
        readOnly={readOnly}
        onAdvance={debugAdvance}
        onResetClock={debugResetClock}
        onLevel={(lv) => play((g) => ({ ...g, buddy: { ...g.buddy, affection: gameParams.LV_TH[lv - 1] } }))}
        onClearSave={() => void debugClearSave()}
        onZukanCheck={() => openScreen({ kind: 'zukanCheck' })}
      />
    )
  }

  const entry = entryId && game.zukan.registered[entryId] ? entryId : null

  return (
    <div className="app-shell">
      {readOnly && (
        <p className="banner banner-warn" role="alert">
          このセーブは新しい版のアプリで保存されています。上書きしないよう、この版では保存しません。アプリを更新してください。
        </p>
      )}
      {notice && (
        <p className="banner" role="status">
          {notice}
          <button type="button" className="btn btn-small" onClick={dismissNotice}>
            閉じる
          </button>
        </p>
      )}
      <main className="app-main">{body}</main>
      {entry && tab === 'zukan' && !screen && (
        <ZukanEntry species={speciesById(entry)} registered={game.zukan.registered[entry]} onClose={() => setEntryId(null)} />
      )}
      {screen?.kind !== 'zukanCheck' && (
        <TabBar
          tab={tab}
          onTab={(t) => {
            setResult(null)
            setEntryId(null)
            openTab(t)
          }}
        />
      )}
    </div>
  )
}
