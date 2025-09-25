/**
 * ProcessingListPage Component - Liste des traitements en cours
 * Page listant tous les traitements de données en cours et historique
 */

import React from 'react'
import { AppLayout } from '@/shared/ui/components/Layout'

export function ProcessingListPage() {
  return (
    <AppLayout title="Traitements">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Traitements</h1>
        <p className="text-gray-600">
          Page des traitements en cours de développement...
        </p>
      </div>
    </AppLayout>
  )
}

ProcessingListPage.displayName = 'ProcessingListPage'

export default ProcessingListPage