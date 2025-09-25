/**
 * Utility function for conditional className concatenation
 * Based on clsx and tailwind-merge
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine class names with Tailwind CSS merge support
 *
 * @param inputs - Class values to combine
 * @returns Merged class name string
 *
 * @example
 * ```ts
 * cn('px-2 py-1', 'px-3', { 'bg-red-500': error })
 * // Result: "py-1 px-3 bg-red-500" (px-2 overridden by px-3)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}