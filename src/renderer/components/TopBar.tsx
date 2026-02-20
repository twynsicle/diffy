import type { ReactElement } from 'react'

import type { AppMode } from '../../shared/types'
import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { useRepoActions } from '../hooks/use-repo-actions'
import { selectRefreshing } from '../store/changes-slice'
import { refreshStatus } from '../store/changes-slice'
import { selectActiveMode, setMode } from '../store/mode-slice'
import {
  selectRepoDisplayName,
  selectRepoRoot,
} from '../store/repo-slice'
import { openSettings } from '../store/ui-slice'

import styles from './TopBar.module.css'

export function TopBar(): ReactElement {
  const dispatch = useAppDispatch()
  const repoRoot = useAppSelector(selectRepoRoot)
  const displayName = useAppSelector(selectRepoDisplayName)
  const refreshing = useAppSelector(selectRefreshing)
  const activeMode = useAppSelector(selectActiveMode)
  const { openAndRefresh } = useRepoActions()

  const handleRefresh = (): void => {
    if (repoRoot) {
      void dispatch(refreshStatus())
    }
  }

  return (
    <div className={styles.topBar}>
      <div className={styles.trafficLightSpacer} />
      <div className={styles.modeToggle}>
        {(['workspace', 'narrative-review'] as const).map((mode: AppMode) => (
          <button
            key={mode}
            className={`${styles.modeButton} ${activeMode === mode ? styles.modeButtonActive : ''}`}
            onClick={() => dispatch(setMode(mode))}
            type="button"
          >
            {mode === 'workspace' ? 'Workspace' : 'Narrative Review'}
          </button>
        ))}
      </div>
      <div className={styles.repoName} title={repoRoot ?? undefined}>
        {displayName || 'Diffy'}
      </div>
      <div className={styles.actions}>
        <button className={styles.button} onClick={() => void openAndRefresh()} type="button">
          Open
        </button>
        {repoRoot && (
          <button className={styles.button} onClick={handleRefresh} type="button">
            <span className={`${styles.icon} ${refreshing ? styles.spinner : ''}`}>↻</span>
            {' '}Refresh
          </button>
        )}
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
