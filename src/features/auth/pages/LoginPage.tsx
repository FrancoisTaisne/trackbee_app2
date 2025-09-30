/**
 * Login Page - Page de connexion
 * Formulaire de connexion avec redirection automatique
 */

import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/state/stores/auth.store'
import { LoginModal } from '@/features/auth/components/LoginModal'

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirection si déjà connecté
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleClose = () => {
    // Rediriger vers la page d'accueil ou une page de landing
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <LoginModal
        isOpen={true}
        onClose={handleClose}
        onLoginSuccess={() => navigate('/dashboard')}
        showCloseButton={true}
      />
    </div>
  )
}

export default LoginPage