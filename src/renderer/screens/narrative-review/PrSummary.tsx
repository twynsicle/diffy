import { type ReactElement, useEffect } from 'react'

import { isExcludedFromAI } from '@shared/ai-file-filter'
import type { PrData } from '@shared/types'

import { useAppDispatch } from '../../hooks/use-app-dispatch'
import { useAppSelector } from '../../hooks/use-app-selector'
import {
  loadSettings,
  selectExcludedPatterns,
  selectSettingsLoaded,
} from '../../store/settings-slice'

import styles from './PrSummary.module.css'

type PrSummaryProps = {
  data: PrData
}

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
  const dispatch = useAppDispatch()
  const totalAdditions = data.files.reduce((sum, f) => sum + f.additions, 0)
  const totalDeletions = data.files.reduce((sum, f) => sum + f.deletions, 0)

  const settingsLoaded = useAppSelector(selectSettingsLoaded)
  const userPatterns = useAppSelector(selectExcludedPatterns)

  useEffect(() => {
    if (!settingsLoaded) {
      void dispatch(loadSettings())
    }
  }, [settingsLoaded, dispatch])

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
        {data.files.map((file) => {
          const cls = STATUS_CLASS_MAP[file.status] ?? 'badgeDefault'
          const label = STATUS_LABEL_MAP[file.status] ?? '?'
          const excluded = isExcludedFromAI(file.filename, userPatterns)
          return (
            <li
              key={file.filename}
              className={`${styles.fileItem} ${excluded ? styles.excluded : ''}`}
            >
              <span className={`${styles.badge} ${styles[cls]}`}>{label}</span>
              <span className={styles.filename}>{file.filename}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
