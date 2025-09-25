/**
 * Login Page - Page de connexion
 * Formulaire de connexion avec redirection automatique
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { LoginModal } from '@/features/auth/components/LoginModal'

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth()

  // Redirection si déjà connecté
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <LoginModal
        isOpen={true}
        onClose={() => {}}
        showCloseButton={false}
      />
    </div>
  )
}

export default LoginPage