import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { planAssets, readAssetManifest } from './tools/precache-plan.mjs'

// どの版かを画面の下に出す（Vercel のビルドだけ VERCEL_GIT_COMMIT_SHA がある）
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || 'local'
const builtAt =
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date()) + ' JST'

const assets = planAssets(readAssetManifest(new URL('./public/assets/manifest.json', import.meta.url)))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 登録は src/main.tsx で行う（Capacitor のネイティブでは登録しない）
      injectRegister: false,
      // PWA の manifest。絵の目録 public/assets/manifest.json とは別物なので名前を分ける
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        name: 'うちのチーズ',
        short_name: 'うちのチーズ',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fff8ec',
        theme_color: '#fff8ec',
        // 仮のアイコン（H16）。192・512 のアイコンは W5 に @capacitor/assets で作る
        icons: [{ src: 'assets/icon/H16.webp', sizes: '256x256', type: 'image/webp' }],
      },
      includeManifestIcons: false,
      workbox: {
        // アプリ本体（JS・CSS・HTML。generated の JSON は JS に入る）と絵の目録・512px の絵（manifest.webmanifest はプラグインが足す）
        globPatterns: ['**/*.{js,css,html}', 'assets/manifest.json', 'assets/**/*.webp'],
        // 1024px（使うときに保存）と Phase1 で使わない絵（重ね絵 D2・vintage・vintage_face）は外す
        globIgnores: assets.exclude,
        // 絵の URL の ?v=（内容の sha256 の先頭8文字）を外して先読みの中から探す
        ignoreURLParametersMatching: [/^v$/, /^utm_/, /^fbclid$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/[^?]*\/1024\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-1024',
              expiration: { maxEntries: 200 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  // Capacitor は dist/ を相対パスで読むので base は './'
  base: './',
  define: {
    __APP_COMMIT__: JSON.stringify(commit),
    __APP_BUILT_AT__: JSON.stringify(builtAt),
  },
  test: {
    environment: 'node',
  },
})
