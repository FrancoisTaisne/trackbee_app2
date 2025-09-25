/**
 * ErrorPage Component - Page d'erreur générique
 * Page affichée en cas d'erreur générale de l'application
 */

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/shared/ui/components'
import { AlertTriangle } from 'lucide-react'

export function ErrorPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Récupérer l'erreur depuis le state ou utiliser une erreur par défaut
  const error = location.state?.error || new Error('Une erreur inattendue s\'est produite')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="h-16 w-16 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Oops ! Une erreur s'est produite
        </h1>

        <p className="text-gray-600 mb-6">
          {error.message || 'Quelque chose s\'est mal passé. Veuillez réessayer.'}
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
            fullWidth
          >
            Actualiser la page
          </Button>

          <Button
            onClick={() => navigate('/')}
            variant="outline"
            fullWidth
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  )
}

ErrorPage.displayName = 'ErrorPage'

export default ErrorPage