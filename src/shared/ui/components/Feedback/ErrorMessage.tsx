/**
 * ErrorMessage - Composant pour afficher les messages d'erreur
 */
import React from 'react'

interface ErrorMessageProps {
  message: string | Error
  className?: string
  onRetry?: () => void
}

export function ErrorMessage({ message, className = '', onRetry }: ErrorMessageProps) {
  const errorMessage = message instanceof Error ? message.message : message

  return (
    <div className={`p-4 rounded-md bg-red-50 border border-red-200 ${className}`}>
      <div className="flex items-start">
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Erreur
          </h3>
          <p className="mt-1 text-sm text-red-700">
            {errorMessage}
          </p>
          {onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="text-sm bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded-md"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage