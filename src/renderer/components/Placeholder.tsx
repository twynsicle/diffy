import type { ReactElement } from 'react'

import styles from './Placeholder.module.css'

type PlaceholderProps = {
  message: string
  hint?: string
}

export function Placeholder({ message, hint }: PlaceholderProps): ReactElement {
  return (
    <div className={styles.placeholder}>
      <span className={styles.message}>{message}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
