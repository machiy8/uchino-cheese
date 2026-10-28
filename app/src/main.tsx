import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { IdbBackend } from './save/idb'
import { boot, watchVisibility } from './state/app'

// Web版（PWA）だけ service worker を登録する。Capacitor のネイティブではアプリに同梱した dist/ を読むので登録しない
if (!Capacitor.isNativePlatform()) registerSW({ immediate: true })

// セーブを読んでから画面を出す（読み込み中は「読み込み中…」）。保存場所はネイティブでも W5 までは IndexedDB
void boot(new IdbBackend()).then(() => watchVisibility(document))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
