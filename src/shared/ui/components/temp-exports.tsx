// @ts-nocheck

/**
 * Composants UI temporaires pour débloquer les erreurs
 * À remplacer par les vrais composants progressivement
 */

import React from 'react'

interface SelectContextValue {
  value?: string
  onSelect: (nextValue: string) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

// ==================== DROPDOWN MENU ====================
export interface DropdownMenuProps {
  children: React.ReactNode
  className?: string
}

export function DropdownMenu({ children, className = '' }: DropdownMenuProps) {
  return <div className={`dropdown-menu ${className}`}>{children}</div>
}

export interface DropdownMenuTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function DropdownMenuTrigger({ children, className = '', asChild = false }: DropdownMenuTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    const existingClassName = typeof children.props.className === 'string' ? children.props.className : ''

    return React.cloneElement(children, {
      className: `${existingClassName} dropdown-trigger ${className}`.trim()
    })
  }

  return <button className={`dropdown-trigger ${className}`}>{children}</button>
}

export interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}

export function DropdownMenuContent({ children, className = '', align = 'start' }: DropdownMenuContentProps) {
  return <div className={`dropdown-content align-${align} ${className}`}>{children}</div>
}

export interface DropdownMenuItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function DropdownMenuItem({ children, className = '', onClick }: DropdownMenuItemProps) {
  return <div className={`dropdown-item ${className}`} onClick={onClick}>{children}</div>
}

// ==================== SELECT ====================
export interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function Select({ children, value, onValueChange, className = '' }: SelectProps) {
  const contextValue = React.useMemo<SelectContextValue>(() => ({
    value,
    onSelect: (nextValue: string) => {
      onValueChange?.(nextValue)
    }
  }), [value, onValueChange])

  return (
    <SelectContext.Provider value={contextValue}>
      <div className={`select ${className}`} data-value={value ?? ''}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  return <button className={`select-trigger ${className}`}>{children}</button>
}

export interface SelectValueProps {
  placeholder?: string
  className?: string
}

export function SelectValue({ placeholder, className = '' }: SelectValueProps) {
  const context = React.useContext(SelectContext)
  const displayValue = context?.value ?? placeholder

  return <span className={`select-value ${className}`}>{displayValue}</span>
}

export interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  return <div className={`select-content ${className}`}>{children}</div>
}

export interface SelectItemProps {
  children: React.ReactNode
  value: string
  className?: string
}

export function SelectItem({ children, value, className = '' }: SelectItemProps) {
  const context = React.useContext(SelectContext)

  const handleClick = () => {
    context?.onSelect(value)
  }

  const isSelected = context?.value === value

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={`select-item ${isSelected ? 'selected' : ''} ${className}`.trim()}
      data-value={value}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

// ==================== SWITCH ====================
export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Switch({ checked = false, onCheckedChange, disabled = false, className = '' }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span className="switch-thumb" />
    </button>
  )
}
// @ts-nocheck
