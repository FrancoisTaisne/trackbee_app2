/**
 * Auth Feature Types
 * Types spécifiques à l'authentification et la gestion de session
 */

// ==================== AUTH TYPES ====================

export interface User {
  id: number
  email: string
  name?: string
  firstName?: string
  lastName?: string
  avatar?: string
  role?: 'admin' | 'user' | 'viewer'
  createdAt: string
  updatedAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  name?: string
}

export interface AuthSession {
  token: string
  user: User
  expiresAt: string
  refreshToken?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  session: AuthSession | null
}

// ==================== AUTH RESPONSE TYPES ====================

export interface LoginResponse {
  success: boolean
  token: string
  user: User
  expiresAt: string
  refreshToken?: string
}

export interface RegisterResponse {
  success: boolean
  token: string
  user: User
  expiresAt: string
  refreshToken?: string
  message?: string
}

export interface RefreshResponse {
  success: boolean
  token: string
  expiresAt: string
}

// ==================== AUTH ERROR TYPES ====================

export interface AuthError {
  code: string
  message: string
  field?: string
  details?: Record<string, unknown>
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_EXISTS'
  | 'EMAIL_NOT_FOUND'
  | 'WEAK_PASSWORD'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'REFRESH_FAILED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'

// ==================== AUTH ACTION TYPES ====================

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<AuthSession>
  register: (data: RegisterData) => Promise<AuthSession>
  logout: () => Promise<void>
  refreshToken: () => Promise<string>
  updateProfile: (data: Partial<User>) => Promise<User>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
}

// ==================== COMPONENT PROPS TYPES ====================

export interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: (session: AuthSession) => void
  defaultMode?: 'login' | 'register'
  title?: string
  subtitle?: string
  showCloseButton?: boolean
}

export interface AuthGuardProps {
  children: import('react').ReactNode
  fallback?: import('react').ReactNode
  redirectTo?: string
  requireRole?: User['role']
}

export interface UserMenuProps {
  user: User
  onLogout: () => void
  onProfile: () => void
  compact?: boolean
  showAvatar?: boolean
  className?: string
}

export interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>
  loading?: boolean
  error?: string | null
  disabled?: boolean
}

export interface RegisterFormProps {
  onSubmit: (data: RegisterData) => Promise<void>
  loading?: boolean
  error?: string | null
  disabled?: boolean
}

// ==================== HOOK TYPES ====================

export interface UseAuthReturn {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  session: AuthSession | null

  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthSession>
  register: (data: RegisterData) => Promise<AuthSession>
  logout: () => Promise<void>
  refreshToken: () => Promise<string>
  updateProfile: (data: Partial<User>) => Promise<User>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>

  // Utilities
  clearError: () => void
  isTokenExpired: () => boolean
  hasRole: (role: User['role']) => boolean
}

export interface UseSessionReturn {
  session: AuthSession | null
  isValid: boolean
  expiresIn: number
  refresh: () => Promise<void>
  destroy: () => void
}

// ==================== VALIDATION TYPES ====================

export interface ValidationRules {
  email: {
    required: boolean
    pattern: RegExp
    message: string
  }
  password: {
    required: boolean
    minLength: number
    pattern?: RegExp
    message: string
  }
  name: {
    required: boolean
    minLength: number
    maxLength: number
    message: string
  }
}

// ==================== STORAGE TYPES ====================

export interface AuthStorageData {
  session: AuthSession
  lastActivity: string
  deviceInfo?: {
    userAgent: string
    platform: string
    timestamp: string
  }
}

// ==================== UTILITY TYPES ====================

export type AuthMode = 'login' | 'register' | 'reset-password' | 'verify-email'

export interface AuthConfig {
  tokenKey: string
  refreshKey: string
  sessionTimeout: number
  refreshThreshold: number
  maxRetries: number
  baseURL: string
}

// ==================== RE-EXPORTS ====================

// Re-export des types core pour convenience
export type { AppError } from '@/core/types/errors'