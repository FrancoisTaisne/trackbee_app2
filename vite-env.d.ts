/**
 * PUSH FINAL - Types Vite Environment
 * Déclaration des types pour import.meta.env et modules Vite
 */

/// <reference types="vite/client" />

// Interface pour les variables d'environnement Vite
interface ImportMetaEnv {
  // Mode et environment
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean

  // Variables personnalisées TrackBee
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEBUG: string
  readonly VITE_DEBUG_BLE: string
  readonly VITE_DEBUG_WIFI: string
  readonly VITE_DEBUG_PERFORMANCE: string
  readonly VITE_DEBUG_STATE: string
  readonly VITE_DEBUG_ORCHESTRATOR: string

  // API endpoints
  readonly VITE_API_LOCAL_URL: string
  readonly VITE_API_WEB_URL: string

  // BLE configuration
  readonly VITE_BLE_SCAN_TIMEOUT: string
  readonly VITE_BLE_CONNECT_TIMEOUT: string
  readonly VITE_BLE_MTU_SIZE: string

  // WiFi configuration
  readonly VITE_WIFI_CONNECT_TIMEOUT: string
  readonly VITE_WIFI_TRANSFER_TIMEOUT: string

  // Performance settings
  readonly VITE_PERF_ENABLE_MONITORING: string
  readonly VITE_PERF_MAX_HISTORY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// PUSH FINAL - Modules CSS et assets
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

declare module '*.scss' {
  const content: { [className: string]: string }
  export default content
}

declare module '*.svg' {
  import { FC, SVGProps } from 'react'
  const content: FC<SVGProps<SVGSVGElement>>
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.gif' {
  const content: string
  export default content
}

declare module '*.webp' {
  const content: string
  export default content
}

// PUSH FINAL - Window globals pour debug
declare global {
  interface Window {
    __REACT_ROOT__?: unknown
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: Record<string, unknown>
  }
}
