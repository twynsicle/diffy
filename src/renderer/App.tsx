import type { ReactElement } from 'react'

import styles from './App.module.css'
import { BinaryPlaceholder } from './components/BinaryPlaceholder'
import { ConfirmModal } from './components/ConfirmModal'
import { DiffToolbar } from './components/DiffToolbar'
import { DiffView } from './components/DiffView'
import { Placeholder } from './components/Placeholder'
import { SidePane } from './components/SidePane'
import { ToastContainer } from './components/ToastContainer'
import { TopBar } from './components/TopBar'
import { useAppSelector } from './hooks/use-app-selector'
import { useDiffLoader } from './hooks/use-diff-loader'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { useRestoreLastRepo } from './hooks/use-restore-last-repo'
import { useStatusListener } from './hooks/use-status-listener'
import { selectSelected } from './store/changes-slice'
import {
  selectDiffError,
  selectDiffIsBinary,
  selectDiffLoading,
} from './store/diff-slice'
import { selectRepoError, selectRepoRoot } from './store/repo-slice'

function MainContent(): ReactElement {
  const repoRoot = useAppSelector(selectRepoRoot)
  const repoError = useAppSelector(selectRepoError)
  const selected = useAppSelector(selectSelected)
  const loading = useAppSelector(selectDiffLoading)
  const diffError = useAppSelector(selectDiffError)
  const isBinary = useAppSelector(selectDiffIsBinary)

  if (!repoRoot) {
    return (
      <Placeholder
        message={repoError ?? 'Open a repository to get started'}
        hint={repoError ? undefined : 'Click "Open" in the title bar'}
      />
    )
  }

  if (!selected) {
    return <Placeholder message="Select a file to view its diff" />
  }

  if (loading) {
    return <Placeholder message="Loading diff..." />
  }

  if (diffError) {
    return <Placeholder message={diffError} />
  }

  if (isBinary) {
    return <BinaryPlaceholder filePath={selected.path} />
  }

  return (
    <div className={styles.diffArea}>
      <DiffToolbar />
      <DiffView />
    </div>
  )
}

export function App(): ReactElement {
  const repoRoot = useAppSelector(selectRepoRoot)
  useStatusListener()
  useRestoreLastRepo()
  useDiffLoader()
  useKeyboardShortcuts()

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.content}>
        <MainContent />
        {repoRoot && <SidePane />}
      </div>
      <ToastContainer />
      <ConfirmModal />
    </div>
  )
}
