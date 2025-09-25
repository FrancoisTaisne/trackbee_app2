/**
 * ProcessingDetailPage Component - Détail d'un traitement
 * Page détaillée d'un traitement spécifique avec statut et résultats
 */

import React from 'react'
import { useParams } from 'react-router-dom'
import { AppLayout } from '@/shared/ui/components/Layout'

export function ProcessingDetailPage() {
  const { processingId } = useParams<{ processingId: string }>()

  return (
    <AppLayout title={`Traitement ${processingId}`}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Détail du traitement</h1>
        <p className="text-gray-600">
          Détail du traitement {processingId} en cours de développement...
        </p>
      </div>
    </AppLayout>
  )
}

ProcessingDetailPage.displayName = 'ProcessingDetailPage'

export default ProcessingDetailPage