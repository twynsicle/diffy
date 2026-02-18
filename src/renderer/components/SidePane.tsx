import type { ReactElement } from 'react'
import { useCallback, useMemo, useReducer, useState } from 'react'

import type { FileChange, Section } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { useResizablePanel } from '../hooks/use-resizable-panel'
import { useSplitPane } from '../hooks/use-split-pane'
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
import { showConfirmModal } from '../store/ui-slice'
import { buildFileTree, collectAllFolderPaths } from '../utils/file-tree'

import { ContextMenu } from './ContextMenu'
import type { ContextMenuItem } from './ContextMenu'
import { FileTree } from './FileTree'
import { SectionHeader } from './SectionHeader'
import styles from './SidePane.module.css'

// --- UI state reducer ---

type SidePaneUiState = {
  unstagedCollapsedFolders: Set<string>
  stagedCollapsedFolders: Set<string>
  unstagedSectionCollapsed: boolean
  stagedSectionCollapsed: boolean
}

type SidePaneUiAction =
  | { type: 'TOGGLE_FOLDER'; section: Section; folderPath: string }
  | { type: 'COLLAPSE_ALL_FOLDERS'; section: Section; folderPaths: string[] }
  | { type: 'EXPAND_ALL_FOLDERS'; section: Section }
  | { type: 'TOGGLE_SECTION'; section: Section }

function getCollapsedKey(section: Section): 'unstagedCollapsedFolders' | 'stagedCollapsedFolders' {
  return section === 'unstaged' ? 'unstagedCollapsedFolders' : 'stagedCollapsedFolders'
}

function getSectionKey(section: Section): 'unstagedSectionCollapsed' | 'stagedSectionCollapsed' {
  return section === 'unstaged' ? 'unstagedSectionCollapsed' : 'stagedSectionCollapsed'
}

function uiReducer(state: SidePaneUiState, action: SidePaneUiAction): SidePaneUiState {
  switch (action.type) {
    case 'TOGGLE_FOLDER': {
      const key = getCollapsedKey(action.section)
      const next = new Set(state[key])
      if (next.has(action.folderPath)) {
        next.delete(action.folderPath)
      } else {
        next.add(action.folderPath)
      }
      return { ...state, [key]: next }
    }
    case 'COLLAPSE_ALL_FOLDERS': {
      const key = getCollapsedKey(action.section)
      return { ...state, [key]: new Set(action.folderPaths) }
    }
    case 'EXPAND_ALL_FOLDERS': {
      const key = getCollapsedKey(action.section)
      return { ...state, [key]: new Set() }
    }
    case 'TOGGLE_SECTION': {
      const key = getSectionKey(action.section)
      return { ...state, [key]: !state[key] }
    }
  }
}

const initialUiState: SidePaneUiState = {
  unstagedCollapsedFolders: new Set(),
  stagedCollapsedFolders: new Set(),
  unstagedSectionCollapsed: false,
  stagedSectionCollapsed: false,
}

// --- Component ---

export function SidePane(): ReactElement {
  const dispatch = useAppDispatch()
  const staged = useAppSelector(selectStaged)
  const unstaged = useAppSelector(selectUnstaged)
  const selected = useAppSelector(selectSelected)

  const { width, handleMouseDown: handleHorizontalResize } = useResizablePanel({
    defaultWidth: 300,
    minWidth: 180,
    maxWidth: 600,
    edge: 'left',
    storageKey: 'diffy:navPanelWidth',
  })
  const { topRatio, handleMouseDown: handleSplitResize } = useSplitPane({
    defaultRatio: 0.5,
    minRatio: 0.15,
    maxRatio: 0.85,
  })

  const [uiState, uiDispatch] = useReducer(uiReducer, initialUiState)
  const [contextMenu, setContextMenu] = useState<{
    file: FileChange
    x: number
    y: number
  } | null>(null)

  // Compute folder existence for collapse-all button visibility
  const unstagedTree = useMemo(() => buildFileTree(unstaged), [unstaged])
  const stagedTree = useMemo(() => buildFileTree(staged), [staged])
  const unstagedHasFolders = useMemo(
    () => unstagedTree.some((n) => n.kind === 'folder'),
    [unstagedTree],
  )
  const stagedHasFolders = useMemo(
    () => stagedTree.some((n) => n.kind === 'folder'),
    [stagedTree],
  )

  const handleSelect = useCallback(
    (path: string, section: Section, origPath?: string) => {
      dispatch(selectFile({ path, section, origPath }))
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

  // Folder staging: stage/unstage all files under a folder path
  const handleStageFolderFiles = useCallback(
    (folderPath: string) => {
      void dispatch(stageFile(folderPath)).then(() => dispatch(refreshStatus()))
    },
    [dispatch],
  )

  const handleUnstageFolderFiles = useCallback(
    (folderPath: string) => {
      void dispatch(unstageFile(folderPath)).then(() => dispatch(refreshStatus()))
    },
    [dispatch],
  )

  // Tree folder toggle
  const handleToggleUnstagedFolder = useCallback(
    (folderPath: string) => {
      uiDispatch({ type: 'TOGGLE_FOLDER', section: 'unstaged', folderPath })
    },
    [],
  )

  const handleToggleStagedFolder = useCallback(
    (folderPath: string) => {
      uiDispatch({ type: 'TOGGLE_FOLDER', section: 'staged', folderPath })
    },
    [],
  )

  // Toggle all folders (collapse all / expand all)
  const unstagedHasCollapsedFolders = uiState.unstagedCollapsedFolders.size > 0
  const stagedHasCollapsedFolders = uiState.stagedCollapsedFolders.size > 0

  const handleToggleAllUnstagedFolders = useCallback(() => {
    if (unstagedHasCollapsedFolders) {
      uiDispatch({ type: 'EXPAND_ALL_FOLDERS', section: 'unstaged' })
    } else {
      const paths = collectAllFolderPaths(unstagedTree)
      uiDispatch({ type: 'COLLAPSE_ALL_FOLDERS', section: 'unstaged', folderPaths: paths })
    }
  }, [unstagedHasCollapsedFolders, unstagedTree])

  const handleToggleAllStagedFolders = useCallback(() => {
    if (stagedHasCollapsedFolders) {
      uiDispatch({ type: 'EXPAND_ALL_FOLDERS', section: 'staged' })
    } else {
      const paths = collectAllFolderPaths(stagedTree)
      uiDispatch({ type: 'COLLAPSE_ALL_FOLDERS', section: 'staged', folderPaths: paths })
    }
  }, [stagedHasCollapsedFolders, stagedTree])

  // Section collapse
  const handleToggleUnstagedSection = useCallback(() => {
    uiDispatch({ type: 'TOGGLE_SECTION', section: 'unstaged' })
  }, [])

  const handleToggleStagedSection = useCallback(() => {
    uiDispatch({ type: 'TOGGLE_SECTION', section: 'staged' })
  }, [])

  const handleContextMenu = useCallback(
    (file: FileChange, x: number, y: number) => {
      setContextMenu({ file, x, y })
    },
    [],
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          label: 'Discard Changes',
          shortcutHint: '\u232B',
          disabled: contextMenu.file.section !== 'unstaged',
          onSelect: () => {
            const file = contextMenu.file
            const msg = file.isUntracked
              ? `Delete untracked file "${file.displayPath}"? This cannot be undone.`
              : `Discard changes to "${file.displayPath}"? This will restore the file to its index state.`
            dispatch(
              showConfirmModal({
                title: 'Discard Changes',
                message: msg,
                onConfirmAction: { type: 'discard', path: file.path },
              }),
            )
          },
        },
        {
          label: 'Delete File',
          onSelect: () => {
            const file = contextMenu.file
            dispatch(
              showConfirmModal({
                title: 'Delete File',
                message: `Permanently delete "${file.displayPath}"? This cannot be undone.`,
                onConfirmAction: { type: 'delete', path: file.path },
              }),
            )
          },
        },
      ]
    : []

  // Compute flex styles based on section collapse state
  const bothCollapsed = uiState.unstagedSectionCollapsed && uiState.stagedSectionCollapsed
  const unstagedStyle: React.CSSProperties = uiState.unstagedSectionCollapsed
    ? { flex: '0 0 auto' }
    : uiState.stagedSectionCollapsed
      ? { flex: 1 }
      : { flex: topRatio }
  const stagedStyle: React.CSSProperties = uiState.stagedSectionCollapsed
    ? { flex: '0 0 auto' }
    : uiState.unstagedSectionCollapsed
      ? { flex: 1 }
      : { flex: 1 - topRatio }

  return (
    <div className={styles.pane} style={{ width }} data-split-container>
      <div className={styles.resizeHandle} onMouseDown={handleHorizontalResize} />
      <div className={styles.section} style={unstagedStyle}>
        <SectionHeader
          label="Unstaged"
          count={unstaged.length}
          actionLabel="Stage All"
          onAction={handleStageAll}
          isCollapsed={uiState.unstagedSectionCollapsed}
          onToggleCollapse={handleToggleUnstagedSection}
          onToggleAllFolders={handleToggleAllUnstagedFolders}
          hasFolders={unstagedHasFolders}
          hasCollapsedFolders={unstagedHasCollapsedFolders}
        />
        {!uiState.unstagedSectionCollapsed && (
          <FileTree
            files={unstaged}
            selectedPath={selected?.section === 'unstaged' ? selected.path : undefined}
            onSelect={handleSelect}
            onAction={handleStageFile}
            actionLabel="Stage"
            emptyMessage="No unstaged changes"
            onContextMenu={handleContextMenu}
            collapsedPaths={uiState.unstagedCollapsedFolders}
            onToggleFolder={handleToggleUnstagedFolder}
            onFolderAction={handleStageFolderFiles}
          />
        )}
      </div>
      {!bothCollapsed && (
        <div className={styles.splitHandle} onMouseDown={handleSplitResize} />
      )}
      <div className={styles.section} style={stagedStyle}>
        <SectionHeader
          label="Staged"
          count={staged.length}
          actionLabel="Unstage All"
          onAction={handleUnstageAll}
          isCollapsed={uiState.stagedSectionCollapsed}
          onToggleCollapse={handleToggleStagedSection}
          onToggleAllFolders={handleToggleAllStagedFolders}
          hasFolders={stagedHasFolders}
          hasCollapsedFolders={stagedHasCollapsedFolders}
        />
        {!uiState.stagedSectionCollapsed && (
          <FileTree
            files={staged}
            selectedPath={selected?.section === 'staged' ? selected.path : undefined}
            onSelect={handleSelect}
            onAction={handleUnstageFile}
            actionLabel="Unstage"
            emptyMessage="No staged changes"
            onContextMenu={handleContextMenu}
            collapsedPaths={uiState.stagedCollapsedFolders}
            onToggleFolder={handleToggleStagedFolder}
            onFolderAction={handleUnstageFolderFiles}
          />
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
