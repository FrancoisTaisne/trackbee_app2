/**
 * Tabs - Composant de navigation par onglets
 */
import React, { createContext, useContext, useEffect, useState } from 'react'

// Context pour les tabs
const TabsContext = createContext<{
  activeTab: string
  setActiveTab: (tab: string) => void
}>({
  activeTab: '',
  setActiveTab: () => {}
})

// Composant principal Tabs
interface TabsProps {
  children: React.ReactNode
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function Tabs({
  children,
  defaultValue,
  value,
  onValueChange,
  className = ''
}: TabsProps) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState(() => value ?? defaultValue ?? '')

  useEffect(() => {
    if (!isControlled && defaultValue !== undefined) {
      setInternalValue(defaultValue)
    }
  }, [defaultValue, isControlled])

  const activeTab = isControlled ? value ?? '' : internalValue

  const handleSetActiveTab = (tab: string) => {
    if (!isControlled) {
      setInternalValue(tab)
    }
    onValueChange?.(tab)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={`tabs-container ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

// Liste des onglets
interface TabsListProps {
  children: React.ReactNode
  className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex border-b border-gray-200 ${className}`} role="tablist">
      {children}
    </div>
  )
}

// Déclencheur d'onglet
interface TabsTriggerProps {
  children: React.ReactNode
  value: string
  className?: string
}

export function TabsTrigger({ children, value, className = '' }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useContext(TabsContext)
  const isActive = activeTab === value

  return (
    <button
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-blue-500 text-blue-600 bg-blue-50'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } ${className}`}
      onClick={() => setActiveTab(value)}
      role="tab"
      aria-selected={isActive}
    >
      {children}
    </button>
  )
}

// Contenu d'onglet
interface TabsContentProps {
  children: React.ReactNode
  value: string
  className?: string
}

export function TabsContent({ children, value, className = '' }: TabsContentProps) {
  const { activeTab } = useContext(TabsContext)

  if (activeTab !== value) {
    return null
  }

  return (
    <div className={`tabs-content p-4 ${className}`} role="tabpanel">
      {children}
    </div>
  )
}

export default Tabs
