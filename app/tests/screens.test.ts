// 画面の描画（react-dom/server）：熟成棚3枠・図鑑82枠（未登録の実在はシルエット、失敗・工房は「？？？」）ほか
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppShell } from '../src/App'
import { addCare, startAging } from '../src/game/cellar'
import { newGameState, type GameState } from '../src/game/state'
import { speciesFile } from '../src/game/zukan'
import type { AppState } from '../src/state/app'
import { CarePage } from '../src/ui/CarePage'
import { CellarPage } from '../src/ui/CellarPage'
import { HarvestPage, HarvestResultView } from '../src/ui/HarvestPage'
import { PrepPage } from '../src/ui/PrepPage'
import { SettingsPage } from '../src/ui/SettingsPage'
import { ZukanEntry, ZukanPage } from '../src/ui/ZukanPage'
import { formatMinutes } from '../src/ui/format'

const MIN = 60_000
const T0 = new Date(2026, 10, 2, 12, 0).getTime()
const noop = () => {}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => decode(renderToStaticMarkup(el))

/** 枠1＝空き、枠2＝仕込んで10分（まだ）、枠3＝Lv4 で仕込んで1日と少し（3%短縮・お手入れ済み） */
function shelf(): GameState {
  let s = newGameState(T0, 'test')
  s = startAging(s, { milk: '牛', bac: '青カビ', press: 0, room: 'しっとり', knead: false }, T0 + 1440 * MIN, 2)
  s = { ...s, buddy: { affection: 300 } }
  s = startAging(s, { milk: '水牛', bac: 'なし', press: 0, room: 'しっとり', knead: true }, T0, 3)
  s = addCare(addCare(s, 3, '洗う'), 3, '塩')
  return s
}

describe('時間の言い方', () => {
  it('0 の単位は書かない', () => {
    expect([0, 30, 60, 174, 1440, 4190, 18748].map(formatMinutes)).toEqual([
      '0分',
      '30分',
      '1時間',
      '2時間54分',
      '1日',
      '2日21時間50分',
      '13日28分',
    ])
  })
})

describe('熟成棚 S3', () => {
  const now = T0 + 1450 * MIN
  const h = html(createElement(CellarPage, { game: shelf(), now, onPrep: noop, onCare: noop, onHarvest: noop }))
  const slots = [...h.matchAll(/<li class="slot[^"]*" data-slot="(\d)" data-state="(\w+)"/g)].map((m) => [m[1], m[2]])

  it('3枠：空き・熟成中（まだ）・取り出せる', () => {
    expect(slots).toEqual([
      ['1', 'empty'],
      ['2', 'aging'],
      ['3', 'ready'],
    ])
    expect(h.match(/>仕込む</g)).toHaveLength(1)
  })

  it('熟成中：経過・まだ取り出せない・あと◯で（短縮なし）', () => {
    expect(h).toContain('経過 10分')
    expect(h).toContain('まだ取り出せません')
    expect(h).toContain('あと20分で「30分もの」')
  })

  it('取り出せる枠：いま取り出すと・あと◯で（短縮後の値）・なつき短縮 −3%・お手入れの回数', () => {
    // 3%：T4＝1,396分・T5＝4,190分。経過 1,450分
    expect(h).toContain('いま取り出すと<strong>「1日もの」</strong>')
    expect(h).toContain(`あと${formatMinutes(4190 - 1450)}で「3日もの」`)
    expect(h).toContain('なつき短縮 −3%')
    expect(h.match(/なつき短縮/g)).toHaveLength(1)
    expect(h).toContain('お手入れ 洗う1・返す0・針0・塩1')
    expect(h).toContain('水牛・なし・圧搾0・しっとり・練る')
  })

  it('取り出すボタンは窓に入った枠だけ押せる', () => {
    const btns = [...h.matchAll(/<button type="button" class="btn btn-primary"( disabled="")?>取り出す<\/button>/g)]
    expect(btns.map((m) => Boolean(m[1]))).toEqual([true, false])
  })
})

describe('仕込み S3a・お手入れ S3b・取り出し S3c', () => {
  it('仕込みは乳から始まり、確認で中身を見せる', () => {
    const first = html(createElement(PrepPage, { slot: 1, onDone: noop, onCancel: noop }))
    expect(first).toContain('data-step="milk"')
    expect([...first.matchAll(/data-choice="([^"]+)"/g)].map((m) => m[1])).toEqual(['牛', '山羊', '羊', '水牛'])
    const last = html(
      createElement(PrepPage, {
        slot: 2,
        onDone: noop,
        onCancel: noop,
        initialStep: 'confirm',
        initialDraft: { milk: '羊', bac: '青カビ', press: 2, room: 'からっと', knead: false },
      }),
    )
    expect(last).toContain('<dd>羊</dd><dt>菌</dt><dd>青カビ</dd><dt>圧搾</dt><dd>2回</dd>')
    expect(last).toContain('>仕込む</button>')
  })

  it('お手入れは4つのボタンと「決まる手入れ」', () => {
    const a = shelf().aging[1]
    const h = html(createElement(CarePage, { aging: a, onCare: noop, onBack: noop }))
    expect([...h.matchAll(/data-care="([^"]+)"/g)].map((m) => m[1])).toEqual(['洗う', '返す', '針', '塩'])
    expect(h).toContain('data-decided="練る"')
  })

  it('取り出し：未解放の仕上げは鍵つきで「図鑑◯種で解放」', () => {
    const a = shelf().aging[1]
    const h = html(createElement(HarvestPage, { aging: a, now: T0 + 1450 * MIN, registeredCount: 3, onHarvest: noop, onBack: noop }))
    const locked = [...h.matchAll(/data-finish="([^"]+)" data-locked="true"/g)].map((m) => m[1])
    expect(locked.sort()).toEqual(['わら', '四角型', '酒', 'ワックス', 'ハート型', 'ピラミッド型', 'シロン', '布'].sort())
    expect(h).toContain('図鑑6種で解放')
    expect(h).toContain('図鑑27種で解放')
    expect(h).not.toContain('図鑑3種で解放')
  })

  it('結果：体の絵＋顔・名前・種類・一言解説・はじめてなら「図鑑に登録」', () => {
    const sp = speciesFile.species.find((s) => s.id === 'r56')!
    const recipe = sp.kind === 'real' ? sp.recipe : null
    const h = html(createElement(HarvestResultView, { result: { species: sp, isNew: true, recipe: recipe!, count: 1 }, onBack: noop, onZukan: noop }))
    expect(h).toContain('図鑑に登録')
    expect(h).toContain(sp.name)
    expect(h).toContain('パスタフィラータ')
    expect(h).toMatch(/assets\/body\/512\/r56\.webp/)
    expect(h).toContain('class="figure-face"')
    const again = html(createElement(HarvestResultView, { result: { species: sp, isNew: false, recipe: recipe!, count: 2 }, onBack: noop, onZukan: noop }))
    expect(again).not.toContain('図鑑に登録')
  })

  it('結果：工房オリジナルには「実在の銘柄ではありません」', () => {
    const sp = speciesFile.species.find((s) => s.id === 'o75')!
    const recipe = { milk: '牛', bac: 'なし', press: 0, room: 'しっとり', time: 'T1', care: 'なし', finish: 'なし' } as const
    const h = html(createElement(HarvestResultView, { result: { species: sp, isNew: true, recipe, count: 1 }, onBack: noop, onZukan: noop }))
    expect(h).toContain('実在の銘柄ではありません')
  })
})

describe('図鑑 S4', () => {
  const registered = { r01: { firstAt: '2026-11-02', count: 3 }, f66: { firstAt: '2026-11-03', count: 1 } }
  const h = html(createElement(ZukanPage, { registered, onOpen: noop }))
  const cards = [...h.matchAll(/data-card="([^"]+)" data-state="(\w+)"/g)].map((m) => ({ id: m[1], state: m[2] }))

  it('82枠が no 順・登録数/82', () => {
    expect(cards.map((c) => c.id)).toEqual([...speciesFile.species].sort((a, b) => a.no - b.no).map((s) => s.id))
    expect(h).toContain('<span class="zukan-progress">2/82</span>')
  })

  it('登録済み＝体の絵＋顔・名前・作った回数（押せる）', () => {
    expect(cards.filter((c) => c.state === 'registered').map((c) => c.id)).toEqual(['r01', 'f66'])
    expect(h).toContain('<span class="zukan-card-name">クリームチーズ</span><span class="zukan-card-count">3回</span>')
    expect(h).toContain('<span class="zukan-card-name">あおくなれず</span><span class="zukan-card-count">1回</span>')
    expect(h.match(/class="figure-face"/g)).toHaveLength(2)
    expect(h.match(/<button type="button" class="zukan-card"/g)).toHaveLength(2)
  })

  it('未登録の実在種＝シルエット（顔なし）＋名前', () => {
    const sil = cards.filter((c) => c.state === 'silhouette')
    expect(sil).toHaveLength(64)
    expect(sil.every((c) => c.id.startsWith('r'))).toBe(true)
    expect(h.match(/class="figure figure-silhouette"/g)).toHaveLength(64)
    const r02 = speciesFile.species.find((s) => s.id === 'r02')!
    expect(h).toMatch(new RegExp(`data-card="r02" data-state="silhouette">.*?<span class="zukan-card-name">${r02.name}</span>`))
  })

  it('未登録の失敗種・工房＝「？？？」（名前も絵も出さない）', () => {
    const sec = cards.filter((c) => c.state === 'secret').map((c) => c.id)
    expect(sec).toHaveLength(16)
    expect(sec.every((id) => /^[fo]/.test(id))).toBe(true)
    expect(h.match(/<span class="zukan-card-name">？？？<\/span>/g)).toHaveLength(16)
    expect(h).not.toContain('きまぐれフレッシュ')
    // 画像は 登録2＋シルエット64 だけ
    expect(h.match(/<img /g)).toHaveLength(66)
  })

  it('詳細：1024px と、届くまでの 512px', () => {
    const sp = speciesFile.species.find((s) => s.id === 'r01')!
    const d = html(createElement(ZukanEntry, { species: sp, registered: registered.r01, onClose: noop }))
    expect(d).toMatch(/class="figure-placeholder" src="[^"]*assets\/body\/512\/r01\.webp/)
    expect(d).toMatch(/assets\/body\/1024\/r01\.webp/)
    expect(d).toContain('<dt>作った回数</dt><dd>3回</dd>')
    expect(d).toContain(sp.kind === 'real' ? sp.expl : '')
  })
})

describe('設定 S8', () => {
  const props = {
    affection: 300,
    clockOffsetMs: 1530 * MIN,
    onAdvance: noop,
    onResetClock: noop,
    onLevel: noop,
    onClearSave: noop,
    onZukanCheck: noop,
  }

  it('デバッグの道具（時間を進める・なつき Lv・セーブを消す・確認用の図鑑ページ）と版', () => {
    const h = html(createElement(SettingsPage, { ...props, debug: true }))
    expect([...h.matchAll(/data-advance="\d+">([^<]+)</g)].map((m) => m[1])).toEqual(['＋30分', '＋3時間', '＋1日', '＋7日'])
    expect(h).toContain('元に戻す')
    expect(h).toContain('いま 1日1時間30分 進めています')
    expect([...h.matchAll(/data-level="(\d+)"/g)]).toHaveLength(10)
    expect(h).toContain('aria-pressed="true" data-level="4"')
    expect(h).toContain('セーブを消す')
    expect(h).toContain('確認用の図鑑ページ')
    expect(h).toMatch(/版 <code>([0-9a-f]{7}|local)<\/code>・ビルド \d{4}-\d{2}-\d{2} \d{2}:\d{2} JST/)
  })

  it('DEBUG_TOOLS でなければ道具は出さない（版は出す）', () => {
    const h = html(createElement(SettingsPage, { ...props, debug: false }))
    expect(h).not.toContain('時間を進める')
    expect(h).not.toContain('セーブを消す')
    expect(h).toContain('版 <code>')
  })
})

describe('骨組み', () => {
  const base: AppState = { phase: 'ready', game: shelf(), readOnly: false, notice: null, clock: T0, tab: 'buddy', screen: null }

  it('下のタブ4つ（相棒・熟成棚・図鑑・設定）。相棒は「準備中」', () => {
    const h = html(createElement(AppShell, base))
    expect([...h.matchAll(/data-tab="(\w+)">([^<]+)</g)].map((m) => m[2])).toEqual(['相棒', '熟成棚', '図鑑', '設定'])
    expect(h).toContain('aria-current="page" data-tab="buddy"')
    expect(h).toContain('準備中')
    expect(html(createElement(AppShell, { ...base, tab: 'cellar' })).match(/data-slot=/g)).toHaveLength(3)
    expect(html(createElement(AppShell, { ...base, tab: 'zukan' })).match(/data-card=/g)).toHaveLength(82)
  })

  it('読み込み中', () => {
    expect(html(createElement(AppShell, { ...base, phase: 'loading' }))).toContain('読み込み中')
  })

  it('読み取り専用のときはそう出して、操作のボタンを押せない', () => {
    const h = html(createElement(AppShell, { ...base, tab: 'cellar', readOnly: true }))
    expect(h).toContain('新しい版のアプリで保存されています')
    expect(h).toContain('<button type="button" class="btn btn-primary" disabled="">仕込む</button>')
  })
})
