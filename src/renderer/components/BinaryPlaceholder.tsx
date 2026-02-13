import type { ReactElement } from 'react'

import styles from './BinaryPlaceholder.module.css'

type BinaryPlaceholderProps = {
  filePath: string
}

export function BinaryPlaceholder({ filePath }: BinaryPlaceholderProps): ReactElement {
  return (
    <div className={styles.container}>
      <span className={styles.message}>Binary file — cannot display diff</span>
      <span className={styles.path}>{filePath}</span>
    </div>
  )
}
