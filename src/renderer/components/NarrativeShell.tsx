import type { ReactElement } from 'react'

import styles from './NarrativeShell.module.css'

export function NarrativeShell(): ReactElement {
  return (
    <div className={styles.shell}>
      <span className={styles.message}>Paste a GitHub PR link to get started</span>
      <span className={styles.hint}>Narrative Review mode walks you through PR changes step by step</span>
    </div>
  )
}
