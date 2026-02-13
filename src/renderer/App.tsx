import type { ReactElement } from 'react'

import styles from './App.module.css'
import { Placeholder } from './components/Placeholder'
import { SidePane } from './components/SidePane'
import { TopBar } from './components/TopBar'
import { useAppSelector } from './hooks/use-app-selector'
import { useRestoreLastRepo } from './hooks/use-restore-last-repo'
import { useStatusListener } from './hooks/use-status-listener'
import { selectRepoError, selectRepoRoot } from './store/repo-slice'

export function App(): ReactElement {
  const repoRoot = useAppSelector(selectRepoRoot)
  const error = useAppSelector(selectRepoError)
  useStatusListener()
  useRestoreLastRepo()

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.content}>
        {repoRoot ? (
          <Placeholder message="Select a file to view its diff" />
        ) : (
          <Placeholder
            message={error ?? 'Open a repository to get started'}
            hint={error ? undefined : 'Click "Open" in the title bar'}
          />
        )}
        {repoRoot && <SidePane />}
      </div>
    </div>
  )
}
