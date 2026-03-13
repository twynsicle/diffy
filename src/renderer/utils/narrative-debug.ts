const DEBUG_VALUES = new Set(['1', 'true', 'yes', 'on'])
const DEBUG_STORAGE_KEY = 'diffy:narrativeDebug'

function normalizeFlag(value: unknown): string | null {
  if (typeof value === 'string') return value.toLowerCase()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase()
  return null
}

export function isNarrativeDebugEnabled(): boolean {
  const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env
  const envRaw = normalizeFlag(metaEnv?.['VITE_NARRATIVE_DEBUG'])
  if (envRaw && DEBUG_VALUES.has(envRaw)) {
    return true
  }

  try {
    const storageRaw = window.localStorage.getItem(DEBUG_STORAGE_KEY)
    if (storageRaw === null) return false
    return DEBUG_VALUES.has(storageRaw.toLowerCase())
  } catch {
    return false
  }
}

export function narrativeDebugLog(message: string, data?: unknown): void {
  if (!isNarrativeDebugEnabled()) return
  const prefix = `[narrative-debug][renderer][${new Date().toISOString()}]`
  if (data === undefined) {
    console.debug(`${prefix} ${message}`)
    return
  }
  console.debug(`${prefix} ${message}`, data)
}
