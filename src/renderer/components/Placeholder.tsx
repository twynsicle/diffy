import type { ReactElement } from 'react'

import styles from './Placeholder.module.css'

type PlaceholderProps = {
  message: string
  hint?: string
  action?: { label: string; onClick: () => void }
}

export function Placeholder({ message, hint, action }: PlaceholderProps): ReactElement {
  return (
    <div className={styles.placeholder}>
      <span className={styles.message}>{message}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
      {action && (
        <button className={styles.actionBtn} onClick={action.onClick} type="button">
          {action.label}
        </button>
      )}
    </div>
  )
}
