import type { ReactElement } from 'react'

import { useAppSelector } from '../../hooks/use-app-selector'
import { selectPrData } from '../../store/narrative-slice'

import styles from './NarrativeToolbar.module.css'

type NarrativeToolbarProps = {
  onRegenerate: () => void
  onClose: () => void
}

export function NarrativeToolbar({ onRegenerate, onClose }: NarrativeToolbarProps): ReactElement {
  const prData = useAppSelector(selectPrData)

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        {prData && (
          <span className={styles.prTitle} title={prData.title}>
            {prData.title}
          </span>
        )}
      </div>
      <div className={styles.right}>
        <button className={styles.regenerateBtn} onClick={onRegenerate} type="button">
          Regenerate
        </button>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          title="Back to PR selection"
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
