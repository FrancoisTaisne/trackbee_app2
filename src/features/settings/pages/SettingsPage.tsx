/**
 * SettingsPage Component - Paramètres de l'application
 * Page de configuration des préférences utilisateur
 */

import React from 'react'
import { Settings, HelpCircle, Info } from 'lucide-react'
import { Switch } from '@headlessui/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge
} from '@/shared/ui/components'
import { useSettingsStore } from '@/core/state/stores/settings.store'

// ==================== COMPOSANT TOGGLE ====================

interface ToggleSwitchProps {
  enabled: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  onChange,
  label,
  description,
  disabled = false
}) => {
  return (
    <Switch.Group>
      <div className="flex items-start justify-between gap-3 py-4 border-b border-gray-200 last:border-0">
        <div className="flex-1 min-w-0">
          <Switch.Label className="block text-sm font-medium text-gray-900 cursor-pointer">
            {label}
          </Switch.Label>
          {description && (
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <Switch
          checked={enabled}
          onChange={onChange}
          disabled={disabled}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            !min-h-0
            ${enabled ? 'bg-primary-600' : 'bg-gray-200'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </Switch>
      </div>
    </Switch.Group>
  )
}

// ==================== COMPOSANT PRINCIPAL ====================

export function SettingsPage() {
  const {
    showHelp,
    showRecommendations,
    toggleHelp,
    toggleRecommendations,
    resetSettings
  } = useSettingsStore()

  const handleReset = () => {
    if (window.confirm('Voulez-vous vraiment réinitialiser tous les paramètres par défaut ?')) {
      resetSettings()
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
          <Settings className="w-7 h-7 text-primary-600" />
          <span>Paramètres</span>
        </h1>
        <p className="text-gray-600 mt-1">
          Personnalisez votre expérience TrackBee
        </p>
      </div>

      {/* Section Affichage et Aide */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HelpCircle className="w-5 h-5 text-primary-600" />
              <CardTitle className="text-lg">Affichage et Aide</CardTitle>
            </div>
            <Badge variant="info" className="text-xs">Interface</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-1">
            <ToggleSwitch
              enabled={showHelp}
              onChange={toggleHelp}
              label="Afficher les descriptions et aides"
              description="Affiche les textes explicatifs sous les boutons et dans les cartes (ex: description des modes de mission)"
            />
            <ToggleSwitch
              enabled={showRecommendations}
              onChange={toggleRecommendations}
              label="Afficher les recommandations"
              description="Affiche les suggestions contextuelles et recommandations intelligentes (ex: modes de mission suggérés)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Exemple visuel */}
      {showHelp && (
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Aperçu des aides activées
                </p>
                <p className="text-xs text-blue-700">
                  Lorsque les aides sont activées (comme maintenant), vous verrez des textes comme celui-ci
                  pour vous guider dans l'utilisation de l'application. Les utilisateurs expérimentés peuvent
                  désactiver ces aides pour une interface plus épurée.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Réinitialisation */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200 pb-4">
          <CardTitle className="text-lg">Réinitialisation</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-900">
                Restaurer les paramètres par défaut
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Réinitialise tous les paramètres à leurs valeurs d'origine
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Info version */}
      <div className="text-center text-xs text-gray-500 pt-4">
        TrackBee v2.0 - Paramètres sauvegardés localement
      </div>
    </div>
  )
}

SettingsPage.displayName = 'SettingsPage'

export default SettingsPage
