import { type ReactElement, useEffect, useRef } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  cancelGeneration,
  selectCancelling,
  selectStreamText,
} from '../store/narrative-slice'

import styles from './GeneratingOverlay.module.css'

const STREAM_PREVIEW_CHARS = 500

export function GeneratingOverlay(): ReactElement {
  const dispatch = useAppDispatch()
  const streamText = useAppSelector(selectStreamText)
  const cancelling = useAppSelector(selectCancelling)
  const previewRef = useRef<HTMLPreElement>(null)

  const preview = streamText.length > STREAM_PREVIEW_CHARS
    ? '...' + streamText.slice(-STREAM_PREVIEW_CHARS)
    : streamText

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight
    }
  }, [preview])

  const handleCancel = (): void => {
    void dispatch(cancelGeneration())
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.pulseRow}>
          <span className={styles.pulse} />
          <span className={styles.label}>
            {cancelling ? 'Cancelling...' : 'Generating narrative review...'}
          </span>
        </div>
        {preview && (
          <pre ref={previewRef} className={styles.streamPreview}>{preview}</pre>
        )}
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
