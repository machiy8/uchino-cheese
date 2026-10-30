// 画面の描画（react-dom/server）：熟成棚3枠・図鑑82枠（未登録の実在はシルエット、失敗・工房は「？？？」）ほか
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AppShell } from '../src/App'
import { speciesFaces } from '../src/face'
import { advanceBuddy, birth, buddyOp } from '../src/game/buddy'
import { addCare, startAging } from '../src/game/cellar'
import { newGameState, type GameState } from '../src/game/state'
import { speciesFile } from '../src/game/zukan'
import type { AppState } from '../src/state/app'
import { CarePage } from '../src/ui/CarePage'
import { CellarPage } from '../src/ui/CellarPage'
import { HarvestPage, HarvestResultView } from '../src/ui/HarvestPage'
import { PrepPage } from '../src/ui/PrepPage'
import { DOWN_OPACITY } from '../src/ui/BuddyFigure'
import { BuddyPage, bubbleOf, MOOD_EXPR, WelcomeModal } from '../src/ui/BuddyPage'
import { LAST_OP_STEPS, SettingsPage } from '../src/ui/SettingsPage'
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
  s = { ...s, buddy: { ...s.buddy, affection: 300 } }
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
  const base: AppState = {
    phase: 'ready',
    game: shelf(),
    readOnly: false,
    loadFailed: false,
    unsaved: false,
    welcome: null,
    notice: null,
    clock: T0,
    tab: 'buddy',
    screen: null,
  }

  it('下のタブ4つ（相棒・熟成棚・図鑑・設定）。相棒がいなければ「熟成棚で最初の1個を取り出すと…」', () => {
    const h = html(createElement(AppShell, base))
    expect([...h.matchAll(/data-tab="(\w+)">([^<]+)</g)].map((m) => m[2])).toEqual(['相棒', '熟成棚', '図鑑', '設定'])
    expect(h).toContain('aria-current="page" data-tab="buddy"')
    expect(h).toContain('data-buddy="none"')
    expect(h).toContain('熟成棚で最初の1個を取り出すと')
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

describe('ホーム S2（相棒）', () => {
  const born = (id = 'r07') => birth(newGameState(T0, 'test'), id, T0)
  const page = (g: GameState, now = T0) => html(createElement(BuddyPage, { game: g, now, onAction: () => null, onCellar: noop }))

  it('相棒あり：体＋顔・ハートと Lv・いっしょに◯日目・機嫌・元気・操作のボタン', () => {
    const h = page(born())
    expect(h).toContain('data-buddy="r07"')
    expect(h).toContain('カマンベール・ド・ノルマンディ')
    expect(h).toMatch(/いっしょに<strong data-days="1">1<\/strong>日目・うまれたて/)
    expect(h).toContain('Lv1')
    expect(h).toContain('data-mood="70"')
    expect(h).toContain('にこにこ')
    expect(h).toContain('data-energy="80"')
    expect(h).toMatch(/<image href="[^"]*body\/512\/r07\.webp/)
    expect(h).toMatch(/<g transform="translate\([^"]+" data-type="maru" data-expr="proud"/)
    expect(h).toContain('aria-label="なでる"')
    for (const op of ['talk', 'feed', 'sleep', 'care', 'sun']) expect(h).toContain(`data-op="${op}"`)
    expect(h.match(/data-op="care"/g)).toHaveLength(2)
    expect(h.match(/data-op="sun"/g)).toHaveLength(2)
  })

  it('相棒なし：「熟成棚で最初の1個を取り出すと…」', () => {
    const h = page(newGameState(T0, 'test'))
    expect(h).toContain('data-buddy="none"')
    expect(h).toContain('熟成棚で最初の1個を取り出すと、そのチーズが相棒として生まれます')
    expect(h).not.toContain('<svg')
  })

  it('うまれたて（1日目）だけ産毛 D1（不透明度は1つの定数・0.5〜1.0）', () => {
    expect(DOWN_OPACITY).toBeGreaterThanOrEqual(0.5)
    expect(DOWN_OPACITY).toBeLessThanOrEqual(1)
    const h = page(born())
    expect(h).toMatch(new RegExp(`<image class="ov-down" href="[^"]*overlay/512/D1\\.webp[^"]*"[^>]* opacity="${DOWN_OPACITY}" mask="url\\(#`))
    const g = born()
    const young = page({ ...g, buddy: { ...g.buddy, daysTogether: 2 } })
    expect(young).not.toContain('ov-down')
    expect(young).toContain('若チーズ')
  })

  it('すね：体を左右反転して顔を消す', () => {
    const g = advanceBuddy(born(), T0 + 30 * 3_600_000).state
    expect(g.buddy.sulking).toBe(true)
    const h = page(g, T0 + 30 * 3_600_000)
    expect(h).toContain('data-sulking="true"')
    expect(h).toContain('<g transform="translate(512 0) scale(-1 1)">')
    expect(h).toContain('data-expr="back"')
    expect(h).not.toContain('data-type="maru"')
    expect(h).toContain('すねてる')
  })

  it('ワイルド度3：E3 を体の太い部分の矩形に合わせ、輪郭を広げた範囲で切る（E1・E2 は出さない）', () => {
    const g = born()
    const h = page({ ...g, buddy: { ...g.buddy, wild: 3, daysTogether: 5 } })
    expect(h).toContain('data-wild="3"')
    expect(h).toMatch(/<image class="ov-wild" href="[^"]*overlay\/512\/E3\.webp[^"]*"[^>]*preserveAspectRatio="none" mask="url\(#[^)]*-mg\)"/)
    expect(h).toContain('<feMorphology operator="dilate" radius="10"')
    expect(h).not.toMatch(/E[12]\.webp/)
    // r07 の bodyMain に ×1.04 で合わせた位置
    const bm = speciesFaces.r07.bodyMain!
    const k = 512 / 1000
    const w = (bm[2] - bm[0]) * k * 1.04
    expect(h).toContain(`width="${w}"`)
  })

  it('ワイルド度1：E1 を外接矩形に散らし、体の輪郭で切る', () => {
    const g = born()
    const h = page({ ...g, buddy: { ...g.buddy, wild: 1 } })
    expect(h).toMatch(/<image class="ov-wild" href="[^"]*overlay\/512\/E1\.webp[^"]*"[^>]* mask="url\(#[^)]*-m\)"/)
    expect(h).not.toContain('feMorphology')
  })

  it('機嫌の5段階 → 表情（対応表 MOOD_EXPR）。寝ている・元気30未満は「ねむい」', () => {
    expect(MOOD_EXPR).toEqual({ ごきげん: 'smile', にこにこ: 'proud', ふつう: 'normal', しょんぼり: 'sad', すねすね: 'sulk' })
    const g = born()
    const ex = (mood: number, energy = 80) => page({ ...g, buddy: { ...g.buddy, mood, energy } }).match(/data-type="maru" data-expr="(\w+)"/)![1]
    expect([90, 70, 50, 30, 10].map((m) => ex(m))).toEqual(['smile', 'proud', 'normal', 'sad', 'sulk'])
    expect(ex(90, 29)).toBe('sleep')
  })

  it('寝ている：寝かせるの代わりに「おはよう」', () => {
    const t = new Date(2026, 10, 2, 21, 0).getTime()
    const g = buddyOp(birth(newGameState(t, 'test'), 'r07', t), { op: 'sleep' }, t).state
    const h = page(g, t)
    expect(h).toContain('data-sleeping="true"')
    expect(h).toContain('data-op="wake"')
    expect(h).not.toContain('data-op="sleep"')
  })

  it('上限・クールダウンの吹き出し：反応の一言と「数値はそのまま」', () => {
    let g = born()
    g = buddyOp(g, { op: 'feed' }, T0).state
    const r = buddyOp(g, { op: 'feed' }, T0 + 60_000)
    const b = bubbleOf(r, { op: 'feed' }, T0 + 60_000, null, () => 0)
    expect(b).toMatchObject({ text: 'ちょっと待ってね', effect: false })
    expect(b.note).toBe('数値はそのまま（あと2時間59分）')
    const ok = bubbleOf(buddyOp(born(), { op: 'pet' }, T0), { op: 'pet' }, T0, null, () => 0)
    expect(ok).toMatchObject({ effect: true, note: '機嫌+5・なつき+1' })
    const h = html(createElement(BuddyPage, { game: g, now: T0, onAction: () => null, onCellar: noop, initialBubble: b }))
    expect(h).toContain('数値はそのまま（あと2時間59分）')
  })

  it('おかえり（再会）のモーダル', () => {
    const h = html(createElement(WelcomeModal, { affection: 10, hint: true, text: 'おかえり！', onClose: noop }))
    expect(h).toContain('再会ボーナス なつき+10')
    expect(h).toContain('おかえり！')
  })
})

describe('取り出しと相棒の誕生・読み込みの失敗・デバッグ', () => {
  it('取り出した結果：相棒がいなかったら「相棒が生まれた！」と「相棒に会う」', () => {
    const species = speciesFile.species[0]
    const recipe = { milk: '牛', bac: 'なし', press: 0, room: 'しっとり', time: 'T1' as const, care: 'なし', finish: 'なし' }
    const h = html(createElement(HarvestResultView, { result: { species, isNew: true, recipe, count: 1, born: true }, onBack: noop, onZukan: noop, onBuddy: noop }))
    expect(h).toContain('data-born="true"')
    expect(h).toContain('相棒が生まれた！')
    expect(h).toContain('相棒に会う')
  })

  it('取り出しの段が変わっていたときの知らせ', () => {
    const s = startAging(newGameState(T0, 'test'), { milk: '牛', bac: 'なし', press: 0, room: 'しっとり', knead: false }, T0)
    const h = html(createElement(HarvestPage, { aging: s.aging[0], now: T0 + 31 * MIN, registeredCount: 0, note: 'ちょうど段階が変わりました', onHarvest: noop, onBack: noop }))
    expect(h).toContain('ちょうど段階が変わりました')
    expect(h).toContain('data-stage="T1"')
  })

  it('読み込みに失敗：保存と操作を止めて「読み込めませんでした」', () => {
    const base: AppState = {
      phase: 'ready',
      game: newGameState(T0, 'test'),
      readOnly: false,
      loadFailed: true,
      unsaved: false,
      welcome: null,
      notice: null,
      clock: T0,
      tab: 'cellar',
      screen: null,
    }
    const h = html(createElement(AppShell, base))
    expect(h).toContain('セーブを読み込めませんでした')
    expect(h).toContain('もう一度読む')
    expect(h).toContain('<button type="button" class="btn btn-primary" disabled="">仕込む</button>')
  })

  it('設定のデバッグ：相棒の種（82種）・機嫌／元気／なつき・最後の操作を◯時間前にする', () => {
    const g = birth(newGameState(T0, 'test'), 'r07', T0)
    const h = html(
      createElement(SettingsPage, {
        debug: true,
        affection: 0,
        buddy: g.buddy,
        clockOffsetMs: 0,
        onAdvance: noop,
        onResetClock: noop,
        onLevel: noop,
        onClearSave: noop,
        onZukanCheck: noop,
      }),
    )
    expect(h.match(/<option /g)).toHaveLength(82)
    expect(h).toContain('data-debug-mood=""')
    expect(h).toContain('data-debug-energy=""')
    expect(h).toContain('data-debug-affection=""')
    for (const n of LAST_OP_STEPS) expect(h).toContain(`data-last-op="${n}"`)
    expect(h).toContain('選び直す')
  })
})
