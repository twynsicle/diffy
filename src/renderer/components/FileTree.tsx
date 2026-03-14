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
  emptyMessage: string
  collapsedPaths: ReadonlySet<string>
  onToggleFolder: (folderPath: string) => void
  onAction?: (path: string) => void
  actionLabel?: string
  onFolderAction?: (folderPath: string) => void
  onContextMenu?: (file: FileChange, x: number, y: number) => void
  virtualize?: boolean
  variant?: 'default' | 'compact'
}

export function FileTree({
  files,
  selectedPath,
  onSelect,
  emptyMessage,
  collapsedPaths,
  onToggleFolder,
  onAction,
  actionLabel,
  onFolderAction,
  onContextMenu,
  virtualize = true,
  variant = 'default',
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
      variant,
    }),
    [
      rows,
      selectedPath,
      onSelect,
      onAction,
      actionLabel,
      onContextMenu,
      onToggleFolder,
      onFolderAction,
      variant,
    ],
  )

  if (files.length === 0) {
    return (
      <div className={styles['container']}>
        <div className={styles['empty']}>{emptyMessage}</div>
      </div>
    )
  }

  if (!virtualize) {
    return (
      <div className={styles['container']}>
        {rows.map((row, i) => (
          <TreeRow
            key={row.kind === 'folder' ? `f:${row.node.path}` : `e:${row.node.file.path}`}
            index={i}
            style={{}}
            ariaAttributes={{}}
            {...rowProps}
          />
        ))}
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
