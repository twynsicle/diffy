import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { List } from 'react-window'

import type { FileChange, Section } from '@shared/types'

import { FileRow } from './FileRow'
import type { FileRowProps } from './FileRow'
import styles from './FileList.module.css'

const ROW_HEIGHT = 28

type FileListProps = {
  files: FileChange[]
  selectedPath?: string
  onSelect: (path: string, section: Section, origPath?: string) => void
  onAction: (path: string) => void
  actionLabel: string
  emptyMessage: string
  onContextMenu?: (file: FileChange, x: number, y: number) => void
}

export function FileList({
  files,
  selectedPath,
  onSelect,
  onAction,
  actionLabel,
  emptyMessage,
  onContextMenu,
}: FileListProps): ReactElement {
  const rowProps: FileRowProps = useMemo(
    () => ({
      files,
      selectedPath,
      onSelect,
      onAction,
      actionLabel,
      onContextMenu,
    }),
    [files, selectedPath, onSelect, onAction, actionLabel, onContextMenu],
  )

  if (files.length === 0) {
    return (
      <div className={styles['container']}>
        <div className={styles['empty']}>{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className={styles['container']}>
      <List
        rowComponent={FileRow}
        rowCount={files.length}
        rowHeight={ROW_HEIGHT}
        rowProps={rowProps}
        overscanCount={5}
      />
    </div>
  )
}
