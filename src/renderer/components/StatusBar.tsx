import type { ReactElement } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { refreshStatus } from '../store/changes-slice'
import { openRepo, selectRepoRoot } from '../store/repo-slice'

import styles from './StatusBar.module.css'

export function StatusBar(): ReactElement {
  const dispatch = useAppDispatch()
  const repoRoot = useAppSelector(selectRepoRoot)

  const handleClick = async (): Promise<void> => {
    const folderPath = await window.api.selectFolder()
    if (folderPath) {
      const result = await dispatch(openRepo(folderPath))
      if (openRepo.fulfilled.match(result)) {
        void dispatch(refreshStatus())
      }
    }
  }

  return (
    <div className={styles.statusBar} onClick={() => void handleClick()} role="button" tabIndex={0}>
      {repoRoot ? (
        <span className={styles.repoPath} title={repoRoot}>{repoRoot}</span>
      ) : (
        <span className={styles.noRepo}>No repository open</span>
      )}
    </div>
  )
}
