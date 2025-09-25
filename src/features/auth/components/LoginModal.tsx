/**
 * LoginModal Component - Modal de connexion/inscription
 * Basé sur le design existant mais avec les nouveaux composants UI
 */

import React, { useState } from 'react'
import { User, Lock, Mail, UserPlus, LogIn } from 'lucide-react'
import { Modal, Button, Input, Badge } from '@/shared/ui/components'
import { useAuth } from '../hooks/useAuth'
import { logger } from '@/core/utils/logger'
import type { LoginModalProps, AuthMode, LoginCredentials, RegisterData } from '../types'

// ==================== LOGGER SETUP ====================

const authLog = {
  debug: (msg: string, data?: unknown) => logger.debug('auth-modal', msg, data),
  info: (msg: string, data?: unknown) => logger.info('auth-modal', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('auth-modal', msg, data),
  error: (msg: string, data?: unknown) => logger.error('auth-modal', msg, data)
}

// ==================== VALIDATION ====================

const validateEmail = (email: string): string | null => {
  if (!email.trim()) return 'L\'email est obligatoire'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Format d\'email invalide'
  return null
}

const validatePassword = (password: string, isRegister = false): string | null => {
  if (!password) return 'Le mot de passe est obligatoire'
  if (isRegister && password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères'
  if (isRegister && !/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule et une minuscule'
  }
  return null
}

const validateName = (name: string): string | null => {
  if (!name.trim()) return 'Le nom est obligatoire'
  if (name.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères'
  return null
}

// ==================== FORM COMPONENTS ====================

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>
  loading: boolean
  error: string | null
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading, error }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation côté client
    const errors: Record<string, string> = {}
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError) errors.email = emailError
    if (passwordError) errors.password = passwordError

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      authLog.warn('Form validation failed', errors)
      return
    }

    try {
      await onSubmit({ email: email.trim(), password })
      authLog.info('Login form submitted successfully')
    } catch (error) {
      authLog.error('Login form submission failed', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Adresse email"
        type="email"
        placeholder="votre@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        leftIcon={<Mail className="w-4 h-4" />}
        disabled={loading}
        autoComplete="email"
        required
      />

      <Input
        label="Mot de passe"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        leftIcon={<Lock className="w-4 h-4" />}
        disabled={loading}
        autoComplete="current-password"
        required
      />

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-md">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        loading={loading}
        loadingText="Connexion en cours..."
        leftIcon={<LogIn className="w-4 h-4" />}
        disabled={loading}
      >
        Se connecter
      </Button>
    </form>
  )
}

interface RegisterFormProps {
  onSubmit: (data: RegisterData) => Promise<void>
  loading: boolean
  error: string | null
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, loading, error }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation côté client
    const errors: Record<string, string> = {}
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password, true)
    const nameError = validateName(name)

    if (emailError) errors.email = emailError
    if (passwordError) errors.password = passwordError
    if (nameError) errors.name = nameError

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      authLog.warn('Registration validation failed', errors)
      return
    }

    try {
      await onSubmit({
        email: email.trim(),
        password,
        name: name.trim()
      })
      authLog.info('Registration form submitted successfully')
    } catch (error) {
      authLog.error('Registration form submission failed', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nom complet"
        type="text"
        placeholder="Votre nom"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        leftIcon={<User className="w-4 h-4" />}
        disabled={loading}
        autoComplete="name"
        required
      />

      <Input
        label="Adresse email"
        type="email"
        placeholder="votre@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        leftIcon={<Mail className="w-4 h-4" />}
        disabled={loading}
        autoComplete="email"
        required
      />

      <Input
        label="Mot de passe"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        helpText="Au moins 8 caractères avec majuscules et minuscules"
        leftIcon={<Lock className="w-4 h-4" />}
        disabled={loading}
        autoComplete="new-password"
        required
      />

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-md">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        loading={loading}
        loadingText="Création du compte..."
        leftIcon={<UserPlus className="w-4 h-4" />}
        disabled={loading}
      >
        Créer un compte
      </Button>
    </form>
  )
}

// ==================== MAIN COMPONENT ====================

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultMode = 'login',
  title,
  subtitle
}) => {
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const { login, register, isLoading, error, clearError } = useAuth()

  // Reset mode when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setMode(defaultMode)
      clearError()
    }
  }, [isOpen, defaultMode, clearError])

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      const session = await login(credentials)
      authLog.info('Login successful via modal')
      onLoginSuccess?.(session)
      onClose()
    } catch (error) {
      authLog.error('Login failed via modal', error)
      // Error is handled by the auth store
    }
  }

  const handleRegister = async (data: RegisterData) => {
    try {
      const session = await register(data)
      authLog.info('Registration successful via modal')
      onLoginSuccess?.(session)
      onClose()
    } catch (error) {
      authLog.error('Registration failed via modal', error)
      // Error is handled by the auth store
    }
  }

  const toggleMode = () => {
    clearError()
    setMode(mode === 'login' ? 'register' : 'login')
    authLog.debug('Auth mode toggled', { newMode: mode === 'login' ? 'register' : 'login' })
  }

  const modalTitle = title || (mode === 'login' ? 'Connexion' : 'Créer un compte')
  const modalSubtitle = subtitle || (
    mode === 'login'
      ? 'Connectez-vous à votre compte TrackBee'
      : 'Créez votre compte TrackBee'
  )

  const modalActions = (
    <div className="flex flex-col items-center space-y-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMode}
        disabled={isLoading}
        className="text-center"
      >
        {mode === 'login'
          ? "Pas encore de compte ? S'inscrire"
          : "Déjà un compte ? Se connecter"
        }
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={onClose}
        disabled={isLoading}
      >
        Fermer
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={modalSubtitle}
      size="md"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      actions={modalActions}
    >
      <div className="py-2">
        {mode === 'login' ? (
          <LoginForm
            onSubmit={handleLogin}
            loading={isLoading}
            error={error}
          />
        ) : (
          <RegisterForm
            onSubmit={handleRegister}
            loading={isLoading}
            error={error}
          />
        )}
      </div>
    </Modal>
  )
}

LoginModal.displayName = 'LoginModal'

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Modal de connexion basique
 * <LoginModal
 *   isOpen={showLogin}
 *   onClose={() => setShowLogin(false)}
 *   onLoginSuccess={(session) => {
 *     console.log('Utilisateur connecté:', session.user)
 *   }}
 * />
 *
 * // Modal d'inscription par défaut
 * <LoginModal
 *   isOpen={showRegister}
 *   onClose={() => setShowRegister(false)}
 *   defaultMode="register"
 *   title="Rejoindre TrackBee"
 *   subtitle="Créez votre compte en quelques secondes"
 * />
 *
 * // Avec callback personnalisé
 * <LoginModal
 *   isOpen={showAuth}
 *   onClose={() => setShowAuth(false)}
 *   onLoginSuccess={(session) => {
 *     navigate('/dashboard')
 *     showNotification('Connexion réussie!')
 *   }}
 * />
 */