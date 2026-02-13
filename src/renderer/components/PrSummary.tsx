import type { ReactElement } from 'react'

import type { PrData } from '@shared/types'

import styles from './PrSummary.module.css'

type PrSummaryProps = {
  data: PrData
}

const MAX_VISIBLE_FILES = 10

const STATUS_CLASS_MAP: Record<string, string> = {
  modified: 'badgeM',
  added: 'badgeA',
  removed: 'badgeD',
  renamed: 'badgeR',
  copied: 'badgeC',
}

const STATUS_LABEL_MAP: Record<string, string> = {
  modified: 'M',
  added: 'A',
  removed: 'D',
  renamed: 'R',
  copied: 'C',
}

export function PrSummary({ data }: PrSummaryProps): ReactElement {
  const totalAdditions = data.files.reduce((sum, f) => sum + f.additions, 0)
  const totalDeletions = data.files.reduce((sum, f) => sum + f.deletions, 0)
  const visibleFiles = data.files.slice(0, MAX_VISIBLE_FILES)
  const overflowCount = data.files.length - MAX_VISIBLE_FILES

  return (
    <div className={styles.summary}>
      <h2 className={styles.title}>{data.title}</h2>
      <div className={styles.meta}>
        <span className={styles.author}>{data.author}</span>
        <span className={styles.branches}>
          <code>{data.baseRefName}</code>
          <span className={styles.arrow}>&larr;</span>
          <code>{data.headRefName}</code>
        </span>
      </div>
      <div className={styles.stats}>
        <span>{data.files.length} files</span>
        <span className={styles.additions}>+{totalAdditions}</span>
        <span className={styles.deletions}>-{totalDeletions}</span>
      </div>
      <ul className={styles.fileList}>
        {visibleFiles.map((file) => {
          const cls = STATUS_CLASS_MAP[file.status] ?? 'badgeDefault'
          const label = STATUS_LABEL_MAP[file.status] ?? '?'
          return (
            <li key={file.filename} className={styles.fileItem}>
              <span className={`${styles.badge} ${styles[cls]}`}>{label}</span>
              <span className={styles.filename}>{file.filename}</span>
            </li>
          )
        })}
      </ul>
      {overflowCount > 0 && (
        <span className={styles.overflow}>&hellip;and {overflowCount} more files</span>
      )}
    </div>
  )
}
