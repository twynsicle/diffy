import { type ReactElement, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

import styles from './RawResponseModal.module.css'

type RawResponseModalProps = {
  text: string
  onClose: () => void
}

export function RawResponseModal({ text, onClose }: RawResponseModalProps): ReactElement {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown) }
  }, [handleKeyDown])

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => { e.stopPropagation() }}>
        <div className={styles.header}>
          <span className={styles.title}>Raw LLM Response</span>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            &times;
          </button>
        </div>
        <pre className={styles.body}>{text}</pre>
      </div>
    </div>,
    document.body,
  )
}
