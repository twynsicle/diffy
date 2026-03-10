import type { DiffRange } from './types'

/**
 * Merge ranges that are within `gap` lines of each other.
 * Input ranges do not need to be sorted.
 */
export function mergeRanges(ranges: readonly DiffRange[], gap: number = 10): DiffRange[] {
  if (ranges.length === 0) return []

  const sorted = [...ranges].sort((a, b) => a.startLine - b.startLine)
  const merged: DiffRange[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = sorted[i]

    if (curr.startLine <= prev.endLine + gap) {
      prev.endLine = Math.max(prev.endLine, curr.endLine)
    } else {
      merged.push({ ...curr })
    }
  }

  return merged
}

/**
 * Expand each range by `context` lines on each side, clamped to [1, maxLine].
 */
export function expandRanges(ranges: readonly DiffRange[], context: number = 5, maxLine: number = Infinity): DiffRange[] {
  return ranges.map((r) => ({
    startLine: Math.max(1, r.startLine - context),
    endLine: Math.min(maxLine, r.endLine + context),
  }))
}
