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

function revealFirstDiff(diffEditor: editor.IStandaloneDiffEditor): void {
  const changes = diffEditor.getLineChanges()
  if (changes && changes.length > 0) {
    const firstLine = changes[0].modifiedStartLineNumber
    diffEditor.getModifiedEditor().revealLineInCenter(firstLine)
    return
  }
  // Diff may not be computed yet — wait for it
  const disposable = diffEditor.onDidUpdateDiff(() => {
    disposable.dispose()
    const updated = diffEditor.getLineChanges()
    if (updated && updated.length > 0) {
      diffEditor.getModifiedEditor().revealLineInCenter(updated[0].modifiedStartLineNumber)
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
