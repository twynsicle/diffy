import type { ReactElement } from 'react'

import styles from './App.module.css'
import { ConfirmModal } from './components/ConfirmModal'
import { SettingsDialog } from './components/SettingsDialog'
import { StatusBar } from './components/StatusBar'
import { ToastContainer } from './components/ToastContainer'
import { TopBar } from './components/TopBar'
import { useAppSelector } from './hooks/use-app-selector'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { useNarrativeKeyboard } from './hooks/use-narrative-keyboard'
import { useNarrativeStream } from './hooks/use-narrative-stream'
import { useRestoreLastRepo } from './hooks/use-restore-last-repo'
import { useStatusListener } from './hooks/use-status-listener'
import { selectActiveMode } from './store/mode-slice'
import { NarrativeShell } from './screens/narrative-review/NarrativeShell'
import { WorkspaceShell } from './screens/workspace/WorkspaceShell'

export function App(): ReactElement {
  const activeMode = useAppSelector(selectActiveMode)
  useStatusListener()
  useRestoreLastRepo()
  useKeyboardShortcuts()
  useNarrativeKeyboard()
  useNarrativeStream()

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.content}>
        {activeMode === 'narrative-review' ? (
          <NarrativeShell />
        ) : (
          <WorkspaceShell />
        )}
      </div>
      <StatusBar />
      <ToastContainer />
      <ConfirmModal />
      <SettingsDialog />
    </div>
  )
}
