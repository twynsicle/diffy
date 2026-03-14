import { type ReactElement, useEffect, useState } from 'react'

import { useAppDispatch } from '../../hooks/use-app-dispatch'
import { useAppSelector } from '../../hooks/use-app-selector'
import { cancelGeneration, selectCancelling } from '../../store/narrative-slice'
import { getAverageDuration } from '../../utils/generation-duration'

import styles from './GeneratingOverlay.module.css'

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
    return () => {
      clearInterval(interval)
    }
  }, [])

  const handleCancel = (): void => {
    void dispatch(cancelGeneration())
  }

  const progress = estimate && estimate > 0 ? Math.min(elapsed / estimate, 0.95) : null

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
              style={
                progress !== null ? { width: `${String(Math.round(progress * 100))}%` } : undefined
              }
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
