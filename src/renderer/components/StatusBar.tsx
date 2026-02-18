import type { ReactElement } from 'react'

import { useAppSelector } from '../hooks/use-app-selector'
import { useRepoActions } from '../hooks/use-repo-actions'
import { selectPollError } from '../store/changes-slice'
import { selectRepoRoot } from '../store/repo-slice'

import styles from './StatusBar.module.css'

export function StatusBar(): ReactElement {
  const repoRoot = useAppSelector(selectRepoRoot)
  const pollError = useAppSelector(selectPollError)
  const { openAndRefresh } = useRepoActions()

  return (
    <div className={styles.statusBar} onClick={() => void openAndRefresh()} role="button" tabIndex={0}>
      {repoRoot ? (
        <span className={styles.repoPath} title={repoRoot}>{repoRoot}</span>
      ) : (
        <span className={styles.noRepo}>No repository open</span>
      )}
      {pollError && (
        <span className={styles.healthWarning} title={pollError}>Git status unavailable</span>
      )}
    </div>
  )
}
