/**
 * ProfilePage Component - Page de profil utilisateur
 * Gestion du profil, changement de mot de passe et paramètres compte
 */

import React, { useState } from 'react'
import { User, Mail, Lock, Save } from 'lucide-react'
import {
  AppLayout,
  PageHeader,
  Section,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge
} from '@/shared/ui/components'
import { useAuth } from '../hooks/useAuth'
import { useSessionStorage, useSessionMonitor } from '../hooks/useSession'
import { logger } from '@/core/utils/logger'
import type { User as UserType } from '../types'

// ==================== LOGGER SETUP ====================

const profileLog = {
  debug: (msg: string, data?: unknown) => logger.debug('profile', msg, data),
  info: (msg: string, data?: unknown) => logger.info('profile', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('profile', msg, data),
  error: (msg: string, data?: unknown) => logger.error('profile', msg, data)
}

// ==================== PROFILE FORM COMPONENT ====================

interface ProfileFormProps {
  user: UserType
  onSave: (data: Partial<UserType>) => Promise<void>
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      // Validation
      const newErrors: Record<string, string> = {}
      if (!formData.name.trim()) {
        newErrors.name = 'Le nom est obligatoire'
      }
      if (!formData.email.trim()) {
        newErrors.email = 'L\'email est obligatoire'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      // Prepare data for update (only changed fields)
      const updateData: Partial<UserType> = {}
      if (formData.name !== user.name) updateData.name = formData.name.trim()
      if (formData.firstName !== user.firstName) updateData.firstName = formData.firstName.trim()
      if (formData.lastName !== user.lastName) updateData.lastName = formData.lastName.trim()
      if (formData.email !== user.email) updateData.email = formData.email.trim()

      if (Object.keys(updateData).length > 0) {
        await onSave(updateData)
        profileLog.info('Profile updated successfully', { fields: Object.keys(updateData) })
      }
    } catch (error) {
      profileLog.error('Profile update failed', error)
      setErrors({ general: 'Erreur lors de la mise à jour du profil' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              leftIcon={<User className="w-4 h-4" />}
              placeholder="Votre prénom"
            />

            <Input
              label="Nom"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              leftIcon={<User className="w-4 h-4" />}
              placeholder="Votre nom"
            />
          </div>

          <Input
            label="Nom d'affichage"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={errors.name}
            leftIcon={<User className="w-4 h-4" />}
            placeholder="Nom affiché dans l'application"
            required
          />

          <Input
            label="Adresse email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            error={errors.email}
            leftIcon={<Mail className="w-4 h-4" />}
            placeholder="votre@email.com"
            required
          />

          {errors.general && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-md">
              <p className="text-sm text-danger-700">{errors.general}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ==================== PASSWORD CHANGE COMPONENT ====================

const PasswordChangeForm: React.FC = () => {
  const { changePassword } = useAuth()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})
    setSuccess(false)

    try {
      // Validation
      const newErrors: Record<string, string> = {}
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Le mot de passe actuel est obligatoire'
      }
      if (!formData.newPassword) {
        newErrors.newPassword = 'Le nouveau mot de passe est obligatoire'
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères'
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      await changePassword(formData.currentPassword, formData.newPassword)
      setSuccess(true)
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      profileLog.info('Password changed successfully')
    } catch (error) {
      profileLog.error('Password change failed', error)
      setErrors({ general: 'Erreur lors du changement de mot de passe' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Changer le mot de passe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Mot de passe actuel"
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
            error={errors.currentPassword}
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <Input
            label="Nouveau mot de passe"
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
            error={errors.newPassword}
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="••••••••"
            helpText="Au moins 8 caractères"
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            error={errors.confirmPassword}
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />

          {errors.general && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-md">
              <p className="text-sm text-danger-700">{errors.general}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-success-50 border border-success-200 rounded-md">
              <p className="text-sm text-success-700">Mot de passe modifié avec succès</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="warning"
              loading={isSubmitting}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Changer le mot de passe
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ==================== ACCOUNT INFO COMPONENT ====================

interface AccountInfoProps {
  user: UserType
}

const AccountInfo: React.FC<AccountInfoProps> = ({ user }) => {
  const { sessionData } = useSessionStorage()
  const { timeRemaining } = useSessionMonitor()

  const getRoleInfo = (role: UserType['role']) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrateur',
          description: 'Accès complet à toutes les fonctionnalités',
          variant: 'solid-danger' as const
        }
      case 'user':
        return {
          label: 'Utilisateur',
          description: 'Accès aux fonctionnalités standard',
          variant: 'primary' as const
        }
      case 'viewer':
        return {
          label: 'Lecture seule',
          description: 'Accès en lecture uniquement',
          variant: 'secondary' as const
        }
      default:
        return {
          label: 'Utilisateur',
          description: 'Accès standard',
          variant: 'secondary' as const
        }
    }
  }

  const roleInfo = getRoleInfo(user.role)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du compte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">ID Utilisateur</label>
            <p className="text-sm text-gray-900 font-mono">#{user.id}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Rôle</label>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={roleInfo.variant} size="sm">
                {roleInfo.label}
              </Badge>
              <span className="text-xs text-gray-500">{roleInfo.description}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Membre depuis</label>
            <p className="text-sm text-gray-900">
              {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Dernière modification</label>
            <p className="text-sm text-gray-900">
              {new Date(user.updatedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {sessionData && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Session active</h4>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Expire dans : {timeRemaining}</p>
              <p>Token de rafraîchissement : {sessionData.hasRefreshToken ? 'Disponible' : 'Non disponible'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== MAIN COMPONENT ====================

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth()

  if (!user) {
    return (
      <AppLayout title="Profil">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-gray-500">Chargement du profil...</p>
        </div>
      </AppLayout>
    )
  }

  const handleProfileUpdate = async (data: Partial<UserType>) => {
    await updateProfile(data)
  }

  return (
    <AppLayout title="Profil">
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles et paramètres de compte"
      />

      <div className="space-y-6">
        <Section>
          <ProfileForm user={user} onSave={handleProfileUpdate} />
        </Section>

        <Section>
          <PasswordChangeForm />
        </Section>

        <Section>
          <AccountInfo user={user} />
        </Section>
      </div>
    </AppLayout>
  )
}

ProfilePage.displayName = 'ProfilePage'

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Page de profil standard
 * <Route path="/profile" element={
 *   <AuthGuard>
 *     <ProfilePage />
 *   </AuthGuard>
 * } />
 *
 * // Avec redirection après mise à jour
 * const ProfilePageWithRedirect = () => {
 *   const navigate = useNavigate()
 *
 *   return (
 *     <ProfilePage
 *       onProfileUpdate={() => {
 *         showNotification('Profil mis à jour!')
 *         navigate('/dashboard')
 *       }}
 *     />
 *   )
 * }
 */