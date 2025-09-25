/**
 * TransferQueuePage Component - File d'attente des transferts
 * Page gérant la queue des transferts de fichiers et uploads
 */

import React from 'react'
import { AppLayout } from '@/shared/ui/components/Layout'

export function TransferQueuePage() {
  return (
    <AppLayout title="File de transfert">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">File de transfert</h1>
        <p className="text-gray-600">
          Gestion de la file d'attente des transferts en cours de développement...
        </p>
      </div>
    </AppLayout>
  )
}

TransferQueuePage.displayName = 'TransferQueuePage'

export default TransferQueuePage