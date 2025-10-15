/**
 * Shared utility types for the TrackBee application
 * Properly typed replacements for temporary any types
 */

import type React from 'react'
import { logger } from '@/core/utils/logger'
import type { ApiResponse } from '@/core/types/transport'

// ==================== API RESPONSE TYPES ====================

// Generic API Response wrapper - use ApiResponse<T> from transport.ts instead
export type { ApiResponse } from '@/core/types/transport'

// Helper function to safely extract data from API responses
export function extractApiData<T>(response: ApiResponse<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
    const apiResponse = response as ApiResponse<T>
    if (apiResponse.data !== undefined) {
      return apiResponse.data
    }
  }
  return response as T
}

// ==================== COMPONENT TYPES ====================

// Base component props with optional className and children
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// Props with event handlers
export interface InteractiveComponentProps extends BaseComponentProps {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void
}

// ==================== EVENT HANDLER TYPES ====================

// Generic event handler types
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void
export type SubmitHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void
export type FocusHandler<T = HTMLElement> = (event: React.FocusEvent<T>) => void

// ==================== HOOK RETURN TYPES ====================

// Query hook return type
export interface QueryHookResult<T> {
  data: T | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

// Mutation hook return type
export interface MutationHookResult<TData, TVariables> {
  mutate: (variables: TVariables) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isLoading: boolean
  isError: boolean
  error: Error | null
  data: TData | undefined
}

// ==================== ERROR TYPES ====================

// Application error with code and message
export interface ApplicationError extends Error {
  code: string
  message: string
  context?: Record<string, unknown>
  retryable?: boolean
}

// Create an application error
export function createError(
  code: string,
  message: string,
  context?: Record<string, unknown>,
  retryable = false
): ApplicationError {
  const error = new Error(message) as ApplicationError
  error.code = code
  error.context = context
  error.retryable = retryable
  return error
}

// ==================== UTILITY FUNCTIONS ====================

// Safely wrap a function with error handling
export function wrapFunction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  errorHandler?: (error: unknown) => TReturn | undefined
): (...args: TArgs) => TReturn | undefined {
  return (...args: TArgs) => {
    try {
      return fn(...args)
    } catch (error) {
      logger.warn('global-utils', 'Function execution error', { error, args })
      return errorHandler?.(error)
    }
  }
}

// Type guard to check if value is defined
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

// Type guard to check if value is a non-empty string
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

// ==================== GLOBAL DECLARATIONS ====================

declare global {
  interface Window {
    // Debugging helpers with proper types
    __TRACKBEE_DEBUG__?: {
      enabled: boolean
      level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
      stores?: Record<string, unknown>
    }
    __API_RESPONSES__?: Array<{
      url: string
      method: string
      status: number
      timestamp: Date
      data?: unknown
    }>
    __BLE_CONNECTIONS__?: Array<{
      deviceId: string
      status: string
      timestamp: Date
    }>
  }
}

export {}
