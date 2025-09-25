/**
 * Composants UI temporaires pour débloquer les erreurs
 * À remplacer par les vrais composants progressivement
 */

import React from 'react'

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

export function DropdownMenuTrigger({ children, className = '', asChild }: DropdownMenuTriggerProps) {
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
  return <div className={`select ${className}`}>{children}</div>
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
  return <span className={`select-value ${className}`}>{placeholder}</span>
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
  return <div className={`select-item ${className}`} data-value={value}>{children}</div>
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