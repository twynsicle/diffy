import type { ReactElement } from 'react'

import styles from './App.module.css'
import { ConfirmModal } from './components/ConfirmModal'
import { SettingsDialog } from './components/SettingsDialog'
import { DiffPanel } from './components/DiffPanel'
import { NarrativeShell } from './components/NarrativeShell'
import { Placeholder } from './components/Placeholder'
import { SidePane } from './components/SidePane'
import { StatusBar } from './components/StatusBar'
import { ToastContainer } from './components/ToastContainer'
import { TopBar } from './components/TopBar'
import { useAppSelector } from './hooks/use-app-selector'
import { useDiffLoader } from './hooks/use-diff-loader'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { useNarrativeKeyboard } from './hooks/use-narrative-keyboard'
import { useRestoreLastRepo } from './hooks/use-restore-last-repo'
import { useStatusListener } from './hooks/use-status-listener'
import { selectSelected } from './store/changes-slice'
import { selectActiveMode } from './store/mode-slice'
import { selectRepoError, selectRepoRoot } from './store/repo-slice'

function MainContent(): ReactElement {
  const repoRoot = useAppSelector(selectRepoRoot)
  const repoError = useAppSelector(selectRepoError)
  const selected = useAppSelector(selectSelected)

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

  const sectionLabel = selected.section === 'staged' ? 'Staged' : 'Unstaged'

  return <DiffPanel filePath={selected.path} sectionBadge={sectionLabel} />
}

export function App(): ReactElement {
  const repoRoot = useAppSelector(selectRepoRoot)
  const activeMode = useAppSelector(selectActiveMode)
  useStatusListener()
  useRestoreLastRepo()
  useDiffLoader()
  useKeyboardShortcuts()
  useNarrativeKeyboard()

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.content}>
        {activeMode === 'narrative-review' ? (
          <NarrativeShell />
        ) : (
          <>
            <MainContent />
            {repoRoot && <SidePane />}
          </>
        )}
      </div>
      <StatusBar />
      <ToastContainer />
      <ConfirmModal />
      <SettingsDialog />
    </div>
  )
}
