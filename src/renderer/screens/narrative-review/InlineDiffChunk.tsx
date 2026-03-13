import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react'

import { DiffEditor } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

import type { DiffChunk, FileAtRefResult } from '@shared/types'

import styles from './InlineDiffChunk.module.css'
import {
  buildInlineDiffSnippets,
  formatSelectedHunkLabel,
  type InlineDiffSnippet,
} from './inline-diff-snippets'
import { narrativeDebugLog } from '../../utils/narrative-debug'

const CONTEXT_LINES = 5
const MIN_EDITOR_HEIGHT = 60
const EDITOR_HEIGHT_PADDING = 12

function buildModelPath(filename: string, snippetKey: string, side: 'original' | 'modified'): string {
  const encodedPath = filename
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `file:///__diffy_inline__/${side}/${encodeURIComponent(snippetKey)}/${encodedPath}`
}

type InlineDiffChunkProps = {
  chunk: DiffChunk
  baseRef: string
  headRef: string
}

function makeOffsetLineNumbers(offset: number): editor.LineNumbersType {
  return (lineNumber: number): string => String(lineNumber + offset - 1)
}

type InlineDiffSnippetEditorProps = {
  chunkFilename: string
  language: string
  snippet: InlineDiffSnippet
  expanded: boolean
}

function InlineDiffSnippetEditor({
  chunkFilename,
  language,
  snippet,
  expanded,
}: InlineDiffSnippetEditorProps): ReactElement {
  const [diffEditor, setDiffEditor] = useState<editor.IStandaloneDiffEditor | null>(null)
  const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_HEIGHT)

  useEffect(() => {
    if (!diffEditor) return

    const originalEditor = diffEditor.getOriginalEditor()
    const modifiedEditor = diffEditor.getModifiedEditor()
    const lineNumbers = expanded ? 'on' : 'off'

    originalEditor.updateOptions({
      lineNumbers: expanded ? lineNumbers : makeOffsetLineNumbers(snippet.originalStartLine),
    })
    modifiedEditor.updateOptions({
      lineNumbers: expanded ? lineNumbers : makeOffsetLineNumbers(snippet.modifiedStartLine),
    })

    const updateHeight = (): void => {
      const contentHeight = Math.max(
        originalEditor.getContentHeight(),
        modifiedEditor.getContentHeight(),
        MIN_EDITOR_HEIGHT - EDITOR_HEIGHT_PADDING,
      )
      setEditorHeight(contentHeight + EDITOR_HEIGHT_PADDING)
    }

    const originalDisposable = originalEditor.onDidContentSizeChange(updateHeight)
    const modifiedDisposable = modifiedEditor.onDidContentSizeChange(updateHeight)
    const diffDisposable = diffEditor.onDidUpdateDiff(updateHeight)

    updateHeight()

    return () => {
      originalDisposable.dispose()
      modifiedDisposable.dispose()
      diffDisposable.dispose()
    }
  }, [
    diffEditor,
    expanded,
    snippet.modifiedStartLine,
    snippet.originalStartLine,
  ])

  return (
    <div
      className={styles.editorWrapper}
      style={{ height: editorHeight }}
    >
      <DiffEditor
        original={snippet.original}
        modified={snippet.modified}
        language={language}
        originalLanguage={language}
        modifiedLanguage={language}
        originalModelPath={buildModelPath(chunkFilename, snippet.key, 'original')}
        modifiedModelPath={buildModelPath(chunkFilename, snippet.key, 'modified')}
        theme="vs-dark"
        onMount={setDiffEditor}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          lineNumbers: expanded ? 'on' : 'off',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'auto',
            handleMouseWheel: false,
          },
          hideUnchangedRegions: expanded
            ? { enabled: false }
            : {
                enabled: true,
                contextLineCount: CONTEXT_LINES,
                minimumLineCount: 1,
                revealLineCount: CONTEXT_LINES,
              },
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 8,
        }}
      />
    </div>
  )
}

export function InlineDiffChunk({ chunk, baseRef, headRef }: InlineDiffChunkProps): ReactElement {
  const [fileData, setFileData] = useState<FileAtRefResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const chunkHunks = useMemo(
    () => (Array.isArray((chunk as { hunks?: unknown }).hunks) ? chunk.hunks : []),
    [chunk],
  )

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

  const rangeLabel = useMemo(() => {
    if (chunkHunks.length === 0) return ''
    return formatSelectedHunkLabel(chunkHunks)
  }, [chunkHunks])

  const snippets = useMemo<InlineDiffSnippet[]>(() => {
    if (!fileData) return []

    if (expanded) {
      return [{
        key: 'full-file',
        original: fileData.original,
        modified: fileData.modified,
        originalStartLine: 1,
        modifiedStartLine: 1,
      }]
    }

    const collapsedSnippets = buildInlineDiffSnippets({
      hunks: chunkHunks,
      original: fileData.original,
      modified: fileData.modified,
      originalLineCount: fileData.originalLineCount,
      modifiedLineCount: fileData.modifiedLineCount,
      contextLines: CONTEXT_LINES,
    })

    if (collapsedSnippets.length > 0) {
      return collapsedSnippets
    }

    // If AI hunks are fully out of bounds, fall back to full-file view instead of rendering an empty diff.
    return [{
      key: 'fallback-full-file',
      original: fileData.original,
      modified: fileData.modified,
      originalStartLine: 1,
      modifiedStartLine: 1,
    }]
  }, [chunkHunks, fileData, expanded])

  useEffect(() => {
    if (!fileData || loading || error) return

    const hasFallback = snippets.some((snippet) => snippet.key === 'fallback-full-file')

    narrativeDebugLog('inline chunk summary', {
      filename: chunk.filename,
      baseRef,
      headRef,
      expanded,
      hunks: chunkHunks,
      fileLineCounts: {
        original: fileData.originalLineCount,
        modified: fileData.modifiedLineCount,
      },
      snippetCount: snippets.length,
      usedFallbackFullFile: hasFallback,
      snippets: snippets.map((snippet) => ({
        key: snippet.key,
        originalStartLine: snippet.originalStartLine,
        modifiedStartLine: snippet.modifiedStartLine,
      })),
    })
  }, [
    baseRef,
    chunk.filename,
    chunkHunks,
    error,
    expanded,
    fileData,
    headRef,
    loading,
    snippets,
  ])

  const handleToggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const resolvedLanguage = fileData?.language ?? chunk.language

  if (loading) {
    return (
      <div className={styles.chunk} role="figure" aria-label={`Diff for ${chunk.filename}`}>
        <div className={styles.header}>
          <span className={styles.filename}>{chunk.filename}</span>
          <span className={styles.badge}>{resolvedLanguage}</span>
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
          <span className={styles.badge}>{resolvedLanguage}</span>
        </div>
        <div className={styles.errorBody}>{error}</div>
      </div>
    )
  }

  return (
    <div className={styles.chunk} role="figure" aria-label={`Diff for ${chunk.filename}`}>
      <div className={styles.header}>
        <span className={styles.filename}>{chunk.filename}</span>
        <span className={styles.badge}>{resolvedLanguage}</span>
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
      {snippets.map((snippet) => (
        <InlineDiffSnippetEditor
          key={snippet.key}
          chunkFilename={chunk.filename}
          language={resolvedLanguage}
          snippet={snippet}
          expanded={expanded}
        />
      ))}
    </div>
  )
}
