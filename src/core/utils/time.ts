// Time utilities
export function formatDistanceToNow(date: Date | string | undefined | null): string {
  // 🔒 Sécurité: Gérer les cas invalides
  if (!date) return "jamais"

  const now = new Date()
  let target: Date

  if (typeof date === "string") {
    target = new Date(date)
  } else if (date instanceof Date) {
    target = date
  } else {
    // Si c'est un objet qui n'est ni string ni Date, retourner un message sûr
    console.warn('[time.ts] formatDistanceToNow received invalid date:', date)
    return "date invalide"
  }

  // Vérifier que la date est valide
  if (isNaN(target.getTime())) {
    console.warn('[time.ts] formatDistanceToNow received invalid date:', date)
    return "date invalide"
  }

  const diff = now.getTime() - target.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `il y a ${days} jour${days > 1 ? "s" : ""}`
  if (hours > 0) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`
  if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? "s" : ""}`
  return "maintenant"
}

// PUSH FINAL - UTILITAIRES MANQUANTES MASSIVEMENT UTILISÉES

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ])
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    delayMs?: number
    onError?: (error: unknown, attempt: number) => void
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, onError } = options
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      onError?.(error, attempt)

      if (attempt <= maxRetries) {
        await sleep(delayMs * attempt)
      }
    }
  }

  throw lastError
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function formatTransferSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }) as T
}
