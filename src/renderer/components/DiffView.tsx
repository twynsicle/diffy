import type { ReactElement } from 'react'
import { useCallback } from 'react'

import { DiffEditor } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

import { useAppSelector } from '../hooks/use-app-selector'
import {
  selectDiffLanguage,
  selectDiffModified,
  selectDiffOriginal,
  selectWrapEnabled,
} from '../store/diff-slice'

import styles from './DiffView.module.css'

const CONTEXT_LINES_ABOVE = 5

function revealFirstDiff(diffEditor: editor.IStandaloneDiffEditor): void {
  const reveal = (lineChanges: editor.ILineChange[]): void => {
    const targetLine = Math.max(1, lineChanges[0].modifiedStartLineNumber - CONTEXT_LINES_ABOVE)
    diffEditor.getModifiedEditor().revealLineNearTop(targetLine)
  }

  const changes = diffEditor.getLineChanges()
  if (changes && changes.length > 0) {
    reveal(changes)
    return
  }
  // Diff may not be computed yet — wait for it
  const disposable = diffEditor.onDidUpdateDiff(() => {
    disposable.dispose()
    const updated = diffEditor.getLineChanges()
    if (updated && updated.length > 0) {
      reveal(updated)
    }
  })
}

export function DiffView(): ReactElement {
  const original = useAppSelector(selectDiffOriginal)
  const modified = useAppSelector(selectDiffModified)
  const language = useAppSelector(selectDiffLanguage)
  const wrapEnabled = useAppSelector(selectWrapEnabled)

  const handleMount = useCallback((editor: editor.IStandaloneDiffEditor) => {
    revealFirstDiff(editor)
  }, [])

  return (
    <div className={styles.container}>
      <DiffEditor
        original={original}
        modified={modified}
        language={language}
        theme="vs-dark"
        keepCurrentOriginalModel={true}
        keepCurrentModifiedModel={true}
        onMount={handleMount}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          lineNumbers: 'on',
          automaticLayout: true,
          wordWrap: wrapEnabled ? 'on' : 'off',
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  )
}
