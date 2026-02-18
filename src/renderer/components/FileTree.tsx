import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { List } from 'react-window'

import type { FileChange, Section } from '@shared/types'

import { buildFileTree, flattenTree } from '../utils/file-tree'

import { TreeRow } from './TreeRow'
import type { TreeRowProps } from './TreeRow'
import styles from './FileTree.module.css'

const ROW_HEIGHT = 28

type FileTreeProps = {
  files: FileChange[]
  selectedPath?: string
  onSelect: (path: string, section: Section, origPath?: string) => void
  onAction: (path: string) => void
  actionLabel: string
  emptyMessage: string
  onContextMenu?: (file: FileChange, x: number, y: number) => void
  collapsedPaths: ReadonlySet<string>
  onToggleFolder: (folderPath: string) => void
  onFolderAction: (folderPath: string) => void
}

export function FileTree({
  files,
  selectedPath,
  onSelect,
  onAction,
  actionLabel,
  emptyMessage,
  onContextMenu,
  collapsedPaths,
  onToggleFolder,
  onFolderAction,
}: FileTreeProps): ReactElement {
  const tree = useMemo(() => buildFileTree(files), [files])
  const rows = useMemo(() => flattenTree(tree, collapsedPaths), [tree, collapsedPaths])

  const rowProps: TreeRowProps = useMemo(
    () => ({
      rows,
      selectedPath,
      onSelect,
      onAction,
      actionLabel,
      onContextMenu,
      onToggleFolder,
      onFolderAction,
    }),
    [rows, selectedPath, onSelect, onAction, actionLabel, onContextMenu, onToggleFolder, onFolderAction],
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
        rowComponent={TreeRow}
        rowCount={rows.length}
        rowHeight={ROW_HEIGHT}
        rowProps={rowProps}
        overscanCount={5}
      />
    </div>
  )
}
