/**
 * Query Provider - Provider TanStack Query
 * Wrapper pour la gestion d'état serveur avec cache
 */

import React, { type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/core/state/queryClient'
import { appConfig } from '@/core/utils/env'
import { stateLog } from '@/core/utils/logger'

// ==================== TYPES ====================

interface QueryProviderProps {
  children: ReactNode
  showDevtools?: boolean
}

// ==================== COMPONENT ====================

export const QueryProvider: React.FC<QueryProviderProps> = ({
  children,
  showDevtools = appConfig.isDev
}) => {
  React.useEffect(() => {
    stateLog.debug('🔧 QueryProvider mounted', { showDevtools })

    return () => {
      stateLog.debug('🧹 QueryProvider unmounted')
    }
  }, [showDevtools])

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* DevTools uniquement en développement */}
      {showDevtools && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}