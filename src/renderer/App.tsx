import { useEffect, type ReactElement } from 'react'

import styles from './App.module.css'
import { SettingsDialog } from './components/SettingsDialog'
import { StatusBar } from './components/StatusBar'
import { ToastContainer } from './components/ToastContainer'
import { TopBar } from './components/TopBar'
import { useAppDispatch } from './hooks/use-app-dispatch'
import { useNarrativeKeyboard } from './hooks/use-narrative-keyboard'
import { useNarrativeStream } from './hooks/use-narrative-stream'
import { useRepoActions } from './hooks/use-repo-actions'
import { useRestoreLastRepo } from './hooks/use-restore-last-repo'
import { NarrativeShell } from './screens/narrative-review/NarrativeShell'
import { openSettings } from './store/ui-slice'

export function App(): ReactElement {
  const dispatch = useAppDispatch()
  const { openAndRefresh } = useRepoActions()
  useRestoreLastRepo()
  useNarrativeKeyboard()
  useNarrativeStream()

  useEffect(() => {
    const unsub = window.api.onShortcutOpenRepo(() => {
      void openAndRefresh()
    })
    return unsub
  }, [openAndRefresh])

  useEffect(() => {
    const unsub = window.api.onShortcutOpenSettings(() => {
      dispatch(openSettings())
    })
    return unsub
  }, [dispatch])

  return (
    <div className={styles.app}>
      <TopBar />
      <div className={styles.content}>
        <NarrativeShell />
      </div>
      <StatusBar />
      <ToastContainer />
      <SettingsDialog />
    </div>
  )
}
