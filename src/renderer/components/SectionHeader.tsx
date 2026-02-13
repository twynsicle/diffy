import type { ReactElement } from 'react'

import styles from './SectionHeader.module.css'

type SectionHeaderProps = {
  label: string
  count: number
  actionLabel: string
  onAction: () => void
}

export function SectionHeader({
  label,
  count,
  actionLabel,
  onAction,
}: SectionHeaderProps): ReactElement {
  return (
    <div className={styles.header}>
      <span className={styles.label}>
        {label} <span className={styles.count}>({count})</span>
      </span>
      {count > 0 && (
        <button className={styles.action} onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
