import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react'

import { DiffEditor } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

import { expandRanges, mergeRanges } from '@shared/merge-ranges'
import type { DiffChunk, DiffRange, FileAtRefResult } from '@shared/types'

import styles from './InlineDiffChunk.module.css'

const LINE_HEIGHT = 19
const EDITOR_PADDING = 10
const CONTEXT_LINES = 5
const MAX_COLLAPSED_HEIGHT = 600
const MAX_EXPANDED_HEIGHT = 800

function extractLines(text: string, startLine: number, endLine: number): string {
  const lines = text.split('\n')
  return lines.slice(startLine - 1, endLine).join('\n')
}

function countLines(text: string): number {
  if (text === '') return 0
  return text.split('\n').length
}

type InlineDiffChunkProps = {
  chunk: DiffChunk
  baseRef: string
  headRef: string
}

export function InlineDiffChunk({ chunk, baseRef, headRef }: InlineDiffChunkProps): ReactElement {
  const [fileData, setFileData] = useState<FileAtRefResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void window.api.getFileAtRef({
      path: chunk.filename,
      baseRef,
      headRef,
    }).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setFileData(result.data)
      } else {
        setError(result.error)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [chunk.filename, baseRef, headRef])

  const expandedRanges = useMemo(
    () => expandRanges(
      mergeRanges(chunk.ranges),
      CONTEXT_LINES,
      fileData?.modifiedLineCount ?? Infinity,
    ),
    [chunk.ranges, fileData?.modifiedLineCount],
  )

  const rangeLabel = useMemo(() => {
    if (expandedRanges.length === 0) return ''
    if (expandedRanges.length === 1) {
      return `L${expandedRanges[0].startLine}–${expandedRanges[0].endLine}`
    }
    return expandedRanges.map((r) => `L${r.startLine}–${r.endLine}`).join(', ')
  }, [expandedRanges])

  const { original, modified, startLineOffset } = useMemo(() => {
    if (!fileData) return { original: '', modified: '', startLineOffset: 1 }

    if (expanded) {
      return {
        original: fileData.original,
        modified: fileData.modified,
        startLineOffset: 1,
      }
    }

    if (expandedRanges.length === 0) {
      return { original: '', modified: '', startLineOffset: 1 }
    }

    // Combine all expanded ranges into one contiguous block
    const firstStart = expandedRanges[0].startLine
    const lastEnd = expandedRanges[expandedRanges.length - 1].endLine
    const combinedRange: DiffRange = { startLine: firstStart, endLine: lastEnd }

    return {
      original: extractLines(fileData.original, combinedRange.startLine, Math.min(combinedRange.endLine, fileData.originalLineCount)),
      modified: extractLines(fileData.modified, combinedRange.startLine, combinedRange.endLine),
      startLineOffset: combinedRange.startLine,
    }
  }, [fileData, expanded, expandedRanges])

  const editorHeight = useMemo(() => {
    const maxLines = Math.max(countLines(original), countLines(modified), 3)
    const rawHeight = maxLines * LINE_HEIGHT + EDITOR_PADDING
    const maxHeight = expanded ? MAX_EXPANDED_HEIGHT : MAX_COLLAPSED_HEIGHT
    return Math.min(rawHeight, maxHeight)
  }, [original, modified, expanded])

  const needsScroll = useMemo(() => {
    const maxLines = Math.max(countLines(original), countLines(modified), 3)
    const rawHeight = maxLines * LINE_HEIGHT + EDITOR_PADDING
    const maxHeight = expanded ? MAX_EXPANDED_HEIGHT : MAX_COLLAPSED_HEIGHT
    return rawHeight > maxHeight
  }, [original, modified, expanded])

  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const handleMount = useCallback((diffEditor: editor.IStandaloneDiffEditor) => {
    if (!expanded && startLineOffset > 1) {
      const firstChangeRange = chunk.ranges[0]
      if (firstChangeRange) {
        const relLine = firstChangeRange.startLine - startLineOffset + 1
        diffEditor.getModifiedEditor().revealLineNearTop(Math.max(1, relLine))
      }
    }
  }, [expanded, startLineOffset, chunk.ranges])

  const lineNumbersFn = useCallback(
    (lineNumber: number): string => String(lineNumber + startLineOffset - 1),
    [startLineOffset],
  )

  if (loading) {
    return (
      <div className={styles.chunk} role="figure" aria-label={`Diff for ${chunk.filename}`}>
        <div className={styles.header}>
          <span className={styles.filename}>{chunk.filename}</span>
          <span className={styles.badge}>{chunk.language}</span>
        </div>
        <div className={styles.loadingBody}>Loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.chunk} role="figure" aria-label={`Diff for ${chunk.filename}`}>
        <div className={styles.header}>
          <span className={styles.filename}>{chunk.filename}</span>
          <span className={styles.badge}>{chunk.language}</span>
        </div>
        <div className={styles.errorBody}>{error}</div>
      </div>
    )
  }

  return (
    <div className={styles.chunk} role="figure" aria-label={`Diff for ${chunk.filename}`}>
      <div className={styles.header}>
        <span className={styles.filename}>{chunk.filename}</span>
        <span className={styles.badge}>{chunk.language}</span>
        {!expanded && rangeLabel && <span className={styles.badge}>{rangeLabel}</span>}
        {fileData && (
          <button
            type="button"
            className={styles.expandButton}
            onClick={handleToggleExpand}
          >
            {expanded ? 'Show Changes Only' : 'Show Full File'}
          </button>
        )}
      </div>
      <div
        className={`${styles.editorWrapper} ${needsScroll ? styles.scrollable : ''}`}
        style={{ height: editorHeight }}
      >
        <DiffEditor
          original={original}
          modified={modified}
          language={chunk.language}
          theme="vs-dark"
          keepCurrentOriginalModel={true}
          keepCurrentModifiedModel={true}
          onMount={handleMount}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            lineNumbers: expanded ? 'on' : lineNumbersFn,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: {
              vertical: needsScroll ? 'auto' : 'hidden',
              horizontal: 'auto',
              handleMouseWheel: needsScroll,
            },
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 8,
          }}
        />
      </div>
    </div>
  )
}
