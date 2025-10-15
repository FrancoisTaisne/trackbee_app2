/**
 * AppLayoutWrapper - Wrapper pour AppLayout avec gestion des modals
 * Gère l'ouverture des modals de login et navigation vers profile
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout, type AppLayoutProps } from './AppLayout'
import { LoginModal } from '@/features/auth/components/LoginModal'

interface AppLayoutWrapperProps extends Omit<AppLayoutProps, 'onOpenLogin' | 'onOpenProfile'> {
  children: React.ReactNode
}

export const AppLayoutWrapper: React.FC<AppLayoutWrapperProps> = ({
  children,
  ...props
}) => {
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleOpenLogin = () => {
    setShowLoginModal(true)
  }

  const handleCloseLogin = () => {
    setShowLoginModal(false)
  }

  const handleOpenProfile = () => {
    navigate('/profile')
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
  }

  return (
    <>
      <AppLayout
        {...props}
        onOpenLogin={handleOpenLogin}
        onOpenProfile={handleOpenProfile}
      >
        {children}
      </AppLayout>

      {/* Modal de login */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseLogin}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  )
}

AppLayoutWrapper.displayName = 'AppLayoutWrapper'
