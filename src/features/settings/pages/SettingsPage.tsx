/**
 * SettingsPage Component - Paramètres de l'application
 * Page de configuration générale de l'application
 */

import React from 'react'

export function SettingsPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Paramètres</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Page de paramètres en cours de développement...
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-300">
          Les réglages seront disponibles prochainement. Revenez bientôt.
        </p>
      </div>
    </div>
  )
}

SettingsPage.displayName = 'SettingsPage'

export default SettingsPage
