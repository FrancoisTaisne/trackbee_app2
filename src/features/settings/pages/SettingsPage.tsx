/**
 * SettingsPage Component - Paramètres de l'application
 * Page de configuration générale de l'application
 */

import React from 'react'
import { AppLayout } from '@/shared/ui/components/Layout'

export function SettingsPage() {
  return (
    <AppLayout title="Paramètres">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Paramètres</h1>
        <p className="text-gray-600">
          Page de paramètres en cours de développement...
        </p>
      </div>
    </AppLayout>
  )
}

SettingsPage.displayName = 'SettingsPage'

export default SettingsPage