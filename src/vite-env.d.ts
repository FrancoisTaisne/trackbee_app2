/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_WS_URL?: string
  readonly VITE_DEBUG?: string
  readonly VITE_ENVIRONMENT?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_BUILD_TIME?: string
  readonly VITE_BUILD_HASH?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ANALYTICS_ID?: string
  readonly VITE_FEATURE_FLAGS?: string
  readonly VITE_LOG_LEVEL?: string
  readonly VITE_PERFORMANCE_MODE?: string
  readonly VITE_ENABLE_PWA?: string
  readonly VITE_OFFLINE_MODE?: string
  readonly VITE_CACHE_VERSION?: string
  readonly VITE_MAX_FILE_SIZE?: string
  readonly VITE_CHUNK_SIZE?: string
  readonly VITE_BLE_TIMEOUT?: string
  readonly VITE_UPLOAD_TIMEOUT?: string
  readonly VITE_RETRY_ATTEMPTS?: string
  readonly VITE_API_TIMEOUT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}