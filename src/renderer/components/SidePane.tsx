import type { ReactElement } from 'react'
import { useCallback } from 'react'

import type { Section } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  refreshStatus,
  selectFile,
  selectSelected,
  selectStaged,
  selectUnstaged,
  stageAll,
  stageFile,
  unstageAll,
  unstageFile,
} from '../store/changes-slice'

import { FileList } from './FileList'
import { SectionHeader } from './SectionHeader'
import styles from './SidePane.module.css'

export function SidePane(): ReactElement {
  const dispatch = useAppDispatch()
  const staged = useAppSelector(selectStaged)
  const unstaged = useAppSelector(selectUnstaged)
  const selected = useAppSelector(selectSelected)

  const handleSelect = useCallback(
    (path: string, section: Section) => {
      dispatch(selectFile({ path, section }))
    },
    [dispatch],
  )

  const handleStageFile = useCallback(
    (path: string) => {
      void dispatch(stageFile(path)).then(() => dispatch(refreshStatus()))
    },
    [dispatch],
  )

  const handleUnstageFile = useCallback(
    (path: string) => {
      void dispatch(unstageFile(path)).then(() => dispatch(refreshStatus()))
    },
    [dispatch],
  )

  const handleStageAll = useCallback(() => {
    void dispatch(stageAll()).then(() => dispatch(refreshStatus()))
  }, [dispatch])

  const handleUnstageAll = useCallback(() => {
    void dispatch(unstageAll()).then(() => dispatch(refreshStatus()))
  }, [dispatch])

  return (
    <div className={styles.pane}>
      <div className={styles.section}>
        <SectionHeader
          label="Unstaged"
          count={unstaged.length}
          actionLabel="Stage All"
          onAction={handleStageAll}
        />
        <FileList
          files={unstaged}
          selectedPath={selected?.section === 'unstaged' ? selected.path : undefined}
          onSelect={handleSelect}
          onAction={handleStageFile}
          actionLabel="Stage"
          emptyMessage="No unstaged changes"
        />
      </div>
      <div className={styles.section}>
        <SectionHeader
          label="Staged"
          count={staged.length}
          actionLabel="Unstage All"
          onAction={handleUnstageAll}
        />
        <FileList
          files={staged}
          selectedPath={selected?.section === 'staged' ? selected.path : undefined}
          onSelect={handleSelect}
          onAction={handleUnstageFile}
          actionLabel="Unstage"
          emptyMessage="No staged changes"
        />
      </div>
    </div>
  )
}
