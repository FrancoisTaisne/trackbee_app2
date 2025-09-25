/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  darkMode: 'class', // Enable class-based dark mode

  theme: {
    extend: {
      // ==================== BRAND COLORS ====================
      colors: {
        // Palette principale TrackBee
        trackbee: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Couleur principale
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },

        // Couleurs sémantiques
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },

        // Couleurs spécifiques IoT/BLE
        ble: {
          connected: '#10b981',    // Vert pour connecté
          connecting: '#f59e0b',   // Orange pour en cours
          disconnected: '#6b7280', // Gris pour déconnecté
          error: '#ef4444',        // Rouge pour erreur
        },

        // Couleurs de transfert
        transfer: {
          pending: '#8b5cf6',      // Violet pour en attente
          active: '#3b82f6',       // Bleu pour actif
          completed: '#10b981',    // Vert pour terminé
          failed: '#ef4444',       // Rouge pour échoué
        }
      },

      // ==================== TYPOGRAPHY ====================
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          'Monaco',
          '"Cascadia Code"',
          '"Roboto Mono"',
          'Consolas',
          '"Courier New"',
          'monospace'
        ],
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },

      // ==================== SPACING & SIZING ====================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        'mobile-safe': 'env(safe-area-inset-bottom)',
      },

      height: {
        'screen-safe': ['100vh', '100dvh'],
        'header': '3.5rem',
        'nav': '4rem',
        'button': '2.75rem',
        'input': '2.5rem',
      },

      width: {
        'sidebar': '16rem',
        'sidebar-collapsed': '4rem',
      },

      maxWidth: {
        'screen-2xl': '1536px',
      },

      // ==================== SHADOWS & EFFECTS ====================
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'button': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'button-hover': '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        'input': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'input-focus': '0 0 0 3px rgba(14, 165, 233, 0.1)',
      },

      borderRadius: {
        'card': '0.75rem',
        'button': '0.5rem',
        'input': '0.375rem',
      },

      // ==================== ANIMATIONS ====================
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'pulse-ble': 'pulseBle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseBle: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(14, 165, 233, 0.7)'
          },
          '70%': {
            boxShadow: '0 0 0 10px rgba(14, 165, 233, 0)'
          },
        },
      },

      // ==================== TRANSITIONS ====================
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },

      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ==================== BREAKPOINTS CUSTOM ====================
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        'mobile': { 'max': '767px' },
        'tablet': { 'min': '768px', 'max': '1023px' },
        'desktop': { 'min': '1024px' },
      },

      // ==================== Z-INDEX ====================
      zIndex: {
        'modal': '1000',
        'dropdown': '900',
        'header': '800',
        'sidebar': '700',
        'overlay': '600',
        'toast': '1100',
        'tooltip': '1200',
      },
    },
  },

  // ==================== PLUGINS ====================
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // Use .form-input, .form-select, etc.
    }),
    require('@headlessui/tailwindcss')({
      prefix: 'ui'
    }),

    // Plugin personnalisé pour les utilitaires TrackBee
    function({ addUtilities, addComponents, theme }) {
      // Utilitaires pour les safe areas mobile
      addUtilities({
        '.safe-top': {
          paddingTop: 'env(safe-area-inset-top)',
        },
        '.safe-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.safe-left': {
          paddingLeft: 'env(safe-area-inset-left)',
        },
        '.safe-right': {
          paddingRight: 'env(safe-area-inset-right)',
        },
        '.safe-x': {
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
        '.safe-y': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
      })

      // Composants réutilisables
      addComponents({
        // Card de base
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.card'),
          boxShadow: theme('boxShadow.card'),
          padding: theme('spacing.6'),
          '&:hover': {
            boxShadow: theme('boxShadow.card-hover'),
          },
          '.dark &': {
            backgroundColor: theme('colors.gray.800'),
          },
        },

        // Bouton de base
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: theme('height.button'),
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
          fontSize: theme('fontSize.sm'),
          fontWeight: theme('fontWeight.medium'),
          borderRadius: theme('borderRadius.button'),
          boxShadow: theme('boxShadow.button'),
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: theme('boxShadow.button-hover'),
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
          },
        },

        // Variantes de boutons
        '.btn-primary': {
          backgroundColor: theme('colors.trackbee.500'),
          color: theme('colors.white'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.trackbee.600'),
          },
        },

        '.btn-secondary': {
          backgroundColor: theme('colors.gray.100'),
          color: theme('colors.gray.900'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.gray.200'),
          },
          '.dark &': {
            backgroundColor: theme('colors.gray.700'),
            color: theme('colors.gray.100'),
            '&:hover:not(:disabled)': {
              backgroundColor: theme('colors.gray.600'),
            },
          },
        },

        '.btn-success': {
          backgroundColor: theme('colors.success.500'),
          color: theme('colors.white'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.success.600'),
          },
        },

        '.btn-danger': {
          backgroundColor: theme('colors.danger.500'),
          color: theme('colors.white'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.danger.600'),
          },
        },

        // Input de base
        '.input': {
          height: theme('height.input'),
          width: '100%',
          paddingLeft: theme('spacing.3'),
          paddingRight: theme('spacing.3'),
          fontSize: theme('fontSize.sm'),
          borderRadius: theme('borderRadius.input'),
          border: `1px solid ${theme('colors.gray.300')}`,
          boxShadow: theme('boxShadow.input'),
          transition: 'all 0.2s ease-in-out',
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.trackbee.500'),
            boxShadow: theme('boxShadow.input-focus'),
          },
          '.dark &': {
            backgroundColor: theme('colors.gray.700'),
            borderColor: theme('colors.gray.600'),
            color: theme('colors.gray.100'),
          },
        },

        // Badge de statut BLE
        '.ble-status': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${theme('spacing.1')} ${theme('spacing.2')}`,
          fontSize: theme('fontSize.xs'),
          fontWeight: theme('fontWeight.medium'),
          borderRadius: theme('borderRadius.full'),
          textTransform: 'uppercase',
          letterSpacing: theme('letterSpacing.wide'),
        },

        '.ble-status-connected': {
          backgroundColor: theme('colors.success.100'),
          color: theme('colors.success.800'),
          '.dark &': {
            backgroundColor: theme('colors.success.900'),
            color: theme('colors.success.200'),
          },
        },

        '.ble-status-connecting': {
          backgroundColor: theme('colors.warning.100'),
          color: theme('colors.warning.800'),
          animation: theme('animation.pulse-ble'),
          '.dark &': {
            backgroundColor: theme('colors.warning.900'),
            color: theme('colors.warning.200'),
          },
        },

        '.ble-status-disconnected': {
          backgroundColor: theme('colors.gray.100'),
          color: theme('colors.gray.800'),
          '.dark &': {
            backgroundColor: theme('colors.gray.800'),
            color: theme('colors.gray.200'),
          },
        },

        '.ble-status-error': {
          backgroundColor: theme('colors.danger.100'),
          color: theme('colors.danger.800'),
          '.dark &': {
            backgroundColor: theme('colors.danger.900'),
            color: theme('colors.danger.200'),
          },
        },
      })
    },
  ],

  // ==================== SAFELIST ====================
  safelist: [
    // Classes dynamiques pour les status BLE
    'ble-status-connected',
    'ble-status-connecting',
    'ble-status-disconnected',
    'ble-status-error',

    // Classes pour les animations
    'animate-pulse-ble',
    'animate-bounce-subtle',
    'animate-fade-in',
    'animate-slide-in-up',

    // Classes pour les couleurs de transfert
    'bg-transfer-pending',
    'bg-transfer-active',
    'bg-transfer-completed',
    'bg-transfer-failed',
    'text-transfer-pending',
    'text-transfer-active',
    'text-transfer-completed',
    'text-transfer-failed',
  ],
}