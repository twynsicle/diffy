import type { ReactElement } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useRepoActions } from '../hooks/use-repo-actions'
import { selectRepoDisplayName, selectRepoRoot } from '../store/repo-slice'
import { openSettings } from '../store/ui-slice'
import { useAppSelector } from '../hooks/use-app-selector'

import styles from './TopBar.module.css'

export function TopBar(): ReactElement {
  const dispatch = useAppDispatch()
  const repoRoot = useAppSelector(selectRepoRoot)
  const displayName = useAppSelector(selectRepoDisplayName)
  const { openAndRefresh } = useRepoActions()

  return (
    <div className={styles.topBar}>
      <div className={styles.trafficLightSpacer} />
      <div className={styles.repoName} title={repoRoot ?? undefined}>
        {displayName || 'Diffy'}
      </div>
      <div className={styles.actions}>
        <button className={styles.button} onClick={() => void openAndRefresh()} type="button">
          Open
        </button>
      </div>
      <button
        className={`${styles.button} ${styles.settingsButton}`}
        onClick={() => dispatch(openSettings())}
        title="Settings (⌘,)"
        type="button"
      >
        <span className={styles.icon}>⚙</span>
      </button>
    </div>
  )
}
