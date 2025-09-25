/**
 * ProfilePage Component - Profil utilisateur
 * Page de gestion du profil et des informations personnelles
 */

import React from 'react'
import { AppLayout } from '@/shared/ui/components/Layout'

export function ProfilePage() {
  return (
    <AppLayout title="Mon profil">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Mon profil</h1>
        <p className="text-gray-600">
          Page de profil utilisateur en cours de développement...
        </p>
      </div>
    </AppLayout>
  )
}

ProfilePage.displayName = 'ProfilePage'

export default ProfilePage