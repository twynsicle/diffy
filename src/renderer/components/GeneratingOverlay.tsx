import { type ReactElement, useEffect, useState } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  cancelGeneration,
  selectCancelling,
} from '../store/narrative-slice'

import styles from './GeneratingOverlay.module.css'

const STORAGE_KEY = 'diffy:generation-durations'
const MAX_STORED = 10

function getAverageDuration(): number | null {
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

function formatTime(ms: number): string {
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${String(secs)}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = secs % 60
  return `${String(mins)}m ${String(remainSecs)}s`
}

export function GeneratingOverlay(): ReactElement {
  const dispatch = useAppDispatch()
  const cancelling = useAppSelector(selectCancelling)
  const [elapsed, setElapsed] = useState(0)
  const [estimate] = useState(() => getAverageDuration())

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      setElapsed(Date.now() - start)
    }, 500)
    return () => { clearInterval(interval) }
  }, [])

  const handleCancel = (): void => {
    void dispatch(cancelGeneration())
  }

  const progress = estimate && estimate > 0
    ? Math.min(elapsed / estimate, 0.95)
    : null

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.pulseRow}>
          <span className={styles.pulse} />
          <span className={styles.label}>
            {cancelling ? 'Cancelling...' : 'Generating narrative review...'}
          </span>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div
              className={progress !== null ? styles.progressBar : styles.progressBarIndeterminate}
              style={progress !== null ? { width: `${String(Math.round(progress * 100))}%` } : undefined}
            />
          </div>
          <div className={styles.timeInfo}>
            <span>{formatTime(elapsed)} elapsed</span>
            {estimate && estimate > 0 && (
              <span>~{formatTime(Math.max(estimate - elapsed, 0))} remaining</span>
            )}
          </div>
        </div>

        <button
          className={styles.cancelBtn}
          onClick={handleCancel}
          disabled={cancelling}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
