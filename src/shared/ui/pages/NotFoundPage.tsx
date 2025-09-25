/**
 * NotFoundPage Component - Page d'erreur 404
 * Page affichée quand une route n'est pas trouvée
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/components'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page non trouvée
        </h2>
        <p className="text-gray-600 mb-8">
          La page que vous recherchez n'existe pas.
        </p>
        <Button onClick={() => navigate('/')}>
          Retour à l'accueil
        </Button>
      </div>
    </div>
  )
}

NotFoundPage.displayName = 'NotFoundPage'

export default NotFoundPage