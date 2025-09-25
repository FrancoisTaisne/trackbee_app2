/**
 * Register Page - Page d'inscription
 * Formulaire d'inscription pour nouveaux utilisateurs
 */

import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { cn } from '@/shared/utils/cn'

const RegisterPage: React.FC = () => {
  const { isAuthenticated } = useAuth()

  // Redirection si déjà connecté
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Créer un compte
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            L'inscription est actuellement fermée
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            TrackBee est en cours de développement.
            Contactez l'administrateur pour obtenir un accès.
          </p>

          <Link
            to="/login"
            className={cn(
              'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg',
              'bg-trackbee-500 text-white hover:bg-trackbee-600',
              'transition-colors duration-200'
            )}
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage