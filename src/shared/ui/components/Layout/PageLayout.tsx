/**
 * PageLayout - Layout de base pour les pages
 */
import React from 'react'

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function PageLayout({ children, title, className = '' }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {title && (
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}

export default PageLayout