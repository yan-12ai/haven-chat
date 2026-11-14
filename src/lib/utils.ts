export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Tiny className joiner – avoids a dependency for something this small. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Builds a conversation title from the first user message. */
export function titleFrom(text: string, max = 42): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trimEnd()}…`
}

/** Groups timestamps into the buckets shown in the sidebar. */
export function dateBucket(timestamp: number, now = Date.now()): string {
  const day = 24 * 60 * 60 * 1000
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  if (timestamp >= startOfToday) return 'Today'
  if (timestamp >= startOfToday - day) return 'Yesterday'
  if (timestamp >= startOfToday - 7 * day) return 'Previous 7 days'
  return 'Older'
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function abortError(): DOMException {
  return new DOMException('The request was aborted.', 'AbortError')
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
