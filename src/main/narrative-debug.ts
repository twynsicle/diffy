const DEBUG_ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function isNarrativeDebugEnabled(): boolean {
  const raw = process.env['DIFFY_NARRATIVE_DEBUG']
  if (typeof raw !== 'string') return false
  return DEBUG_ENABLED_VALUES.has(raw.toLowerCase())
}

export function narrativeDebugLog(message: string, data?: unknown): void {
  if (!isNarrativeDebugEnabled()) return
  const prefix = `[narrative-debug][main][${new Date().toISOString()}]`
  if (data === undefined) {
    console.log(`${prefix} ${message}`)
    return
  }
  console.log(`${prefix} ${message}`, data)
}
