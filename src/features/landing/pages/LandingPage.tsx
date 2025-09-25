/**
 * Landing Page - Page d'accueil publique
 * Introduction à TrackBee et call-to-action pour connexion
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Wifi, Smartphone, Database, ArrowRight, CheckCircle } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-trackbee-500 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  TrackBee
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Géolocalisation IoT Pro
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-6">
              <Link
                to="/login"
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  'bg-trackbee-500 text-white hover:bg-trackbee-600',
                  'transition-colors duration-200'
                )}
              >
                Se connecter
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Géolocalisation IoT
              <span className="block text-trackbee-500">
                Professionnelle
              </span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              TrackBee vous permet de surveiller l'évolution précise de points géographiques
              avec des IoT autonomes et des calculs de post-traitement GNSS professionnels.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className={cn(
                  'inline-flex items-center px-8 py-3 text-lg font-medium rounded-lg',
                  'bg-trackbee-500 text-white hover:bg-trackbee-600',
                  'transition-colors duration-200',
                  'shadow-lg hover:shadow-xl'
                )}
              >
                Commencer maintenant
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>

              <Link
                to="/demo"
                className={cn(
                  'inline-flex items-center px-8 py-3 text-lg font-medium rounded-lg',
                  'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200'
                )}
              >
                Voir la démo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Fonctionnalités Principales
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Une solution complète pour le suivi géographique professionnel
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-trackbee-100 dark:bg-trackbee-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-trackbee-600 dark:text-trackbee-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Précision GNSS
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Post-traitement avec les bases RGP françaises pour une précision centimétrique
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-trackbee-100 dark:bg-trackbee-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Wifi className="w-8 h-8 text-trackbee-600 dark:text-trackbee-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                IoT Autonomes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dispositifs ESP32 avec batteries longue durée et transmission WiFi/BLE
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-trackbee-100 dark:bg-trackbee-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-trackbee-600 dark:text-trackbee-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                App Mobile
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Interface intuitive pour configurer, surveiller et récupérer les données
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-trackbee-100 dark:bg-trackbee-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-trackbee-600 dark:text-trackbee-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Évolution Temporelle
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Suivi des déplacements dans le temps avec analyses et rapports détaillés
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Cas d'Usage
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              TrackBee s'adapte à vos besoins métier
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Use Case 1 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <CheckCircle className="w-8 h-8 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Surveillance Bâtiments
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Détection précoce de mouvements ou tassements sur ouvrages d'art, bâtiments historiques.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>• Mesures continues automatisées</li>
                <li>• Alertes en temps réel</li>
                <li>• Historique de déplacement</li>
              </ul>
            </div>

            {/* Use Case 2 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <CheckCircle className="w-8 h-8 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Géologie & Mines
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Surveillance géotechnique de sites sensibles, carrières et zones instables.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>• Réseaux de capteurs étendus</li>
                <li>• Résistance environnementale</li>
                <li>• Données géoréférencées</li>
              </ul>
            </div>

            {/* Use Case 3 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <CheckCircle className="w-8 h-8 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Infrastructure
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Monitoring de ponts, barrages, tunnels et autres infrastructures critiques.
              </p>
              <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <li>• Surveillance 24/7</li>
                <li>• Reporting automatique</li>
                <li>• Conformité réglementaire</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-trackbee-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à démarrer ?
          </h2>
          <p className="text-xl text-trackbee-100 mb-8">
            Découvrez la puissance de la géolocalisation IoT professionnelle
          </p>

          <Link
            to="/login"
            className={cn(
              'inline-flex items-center px-8 py-3 text-lg font-medium rounded-lg',
              'bg-white text-trackbee-500 hover:bg-gray-50',
              'transition-colors duration-200',
              'shadow-lg hover:shadow-xl'
            )}
          >
            Commencer maintenant
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-trackbee-500 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">TrackBee</span>
            </div>

            <p className="text-sm mb-4">
              Solution professionnelle de géolocalisation IoT
            </p>

            <p className="text-xs">
              © 2024 TrackBee. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage