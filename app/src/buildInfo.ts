// どの版かを画面に出すための値。vite.config.ts の define がビルド時に入れる（version は package.json）
// （Vercel のビルドは VERCEL_GIT_COMMIT_SHA の先頭7文字、無ければ "local"。日時は日本時間の文字列）
declare const __APP_VERSION__: string
declare const __APP_COMMIT__: string
declare const __APP_BUILT_AT__: string

export const buildInfo = {
  /** package.json の version（セーブ文書の meta.appVersion） */
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  builtAt: __APP_BUILT_AT__,
}
