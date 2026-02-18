const STORAGE_KEY = 'diffy:generation-durations'
const MAX_STORED = 10

export function getAverageDuration(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const durations: number[] = JSON.parse(raw) as number[]
    if (!Array.isArray(durations) || durations.length === 0) return null
    const sum = durations.reduce((a, b) => a + b, 0)
    return sum / durations.length
  } catch {
    return null
  }
}

export function recordGenerationDuration(durationMs: number): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const durations: number[] = raw ? (JSON.parse(raw) as number[]) : []
    durations.push(durationMs)
    if (durations.length > MAX_STORED) {
      durations.splice(0, durations.length - MAX_STORED)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(durations))
  } catch {
    // ignore storage errors
  }
}
