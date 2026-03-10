import type { ReactElement } from 'react'

import { useAppSelector } from '../../hooks/use-app-selector'
import { selectBranch } from '../../store/repo-slice'

import styles from './BranchToolbar.module.css'

export function BranchToolbar(): ReactElement {
  const branch = useAppSelector(selectBranch)

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.branchName}>{branch || '...'}</span>
      </div>
      <div className={styles.empty} />
    </div>
  )
}
