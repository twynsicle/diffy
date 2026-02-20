import { type ReactElement, useMemo } from 'react'

import { DiffEditor } from '@monaco-editor/react'

import type { DiffChunk } from '@shared/types'

import { parseDiffChunk } from '../../utils/parse-diff-chunk'

import styles from './InlineDiffChunk.module.css'

const LINE_HEIGHT = 19
const EDITOR_PADDING = 10

function countLines(text: string): number {
  if (text === '') return 0
  return text.split('\n').length
}

type InlineDiffChunkProps = {
  chunk: DiffChunk
}

export function InlineDiffChunk({ chunk }: InlineDiffChunkProps): ReactElement {
  const { original, modified } = useMemo(() => parseDiffChunk(chunk.content), [chunk.content])

  const editorHeight = useMemo(() => {
    const maxLines = Math.max(countLines(original), countLines(modified), 3)
    return maxLines * LINE_HEIGHT + EDITOR_PADDING
  }, [original, modified])

  return (
    <div className={styles.chunk} role="figure" aria-label={`Diff for ${chunk.filename}`}>
      <div className={styles.header}>
        <span className={styles.filename}>{chunk.filename}</span>
        <span className={styles.badge}>{chunk.language}</span>
        {chunk.startLine > 0 && <span className={styles.badge}>L{chunk.startLine}</span>}
      </div>
      <div className={styles.editorWrapper} style={{ height: editorHeight }}>
        <DiffEditor
          original={original}
          modified={modified}
          language={chunk.language}
          theme="vs-dark"
          keepCurrentOriginalModel={true}
          keepCurrentModifiedModel={true}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: { vertical: 'hidden', horizontal: 'auto', handleMouseWheel: false },
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 8,
          }}
        />
      </div>
    </div>
  )
}
