import type { ReactElement } from 'react'

import type { AppMode } from '../../shared/types'
import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { refreshStatus, selectRefreshing } from '../store/changes-slice'
import { selectActiveMode, setMode } from '../store/mode-slice'
import {
  openRepo,
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

  const handleOpen = async (): Promise<void> => {
    const folderPath = await window.api.selectFolder()
    if (folderPath) {
      const result = await dispatch(openRepo(folderPath))
      if (openRepo.fulfilled.match(result)) {
        void dispatch(refreshStatus())
      }
    }
  }

  const handleRefresh = (): void => {
    if (repoRoot) {
      void dispatch(refreshStatus())
    }
  }

  return (
    <div className={styles.topBar}>
      <div className={styles.trafficLightSpacer} />
      <div className={styles.repoName} title={repoRoot ?? undefined}>
        {displayName || 'Diffy'}
      </div>
      <div className={styles.modeToggle}>
        {(['diff-review', 'narrative-review'] as const).map((mode: AppMode) => (
          <button
            key={mode}
            className={`${styles.modeButton} ${activeMode === mode ? styles.modeButtonActive : ''}`}
            onClick={() => dispatch(setMode(mode))}
            type="button"
          >
            {mode === 'diff-review' ? 'Diff Review' : 'Narrative Review'}
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        <button
          className={styles.button}
          onClick={() => dispatch(openSettings())}
          title="Settings (⌘,)"
          type="button"
        >
          ⚙
        </button>
        <button className={styles.button} onClick={() => void handleOpen()} type="button">
          Open
        </button>
        {repoRoot && (
          <button className={styles.button} onClick={handleRefresh} type="button">
            <span className={refreshing ? styles.spinner : ''}>↻</span>
            {' '}Refresh
          </button>
        )}
      </div>
    </div>
  )
}
