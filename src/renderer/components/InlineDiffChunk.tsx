import { type ReactElement, useMemo } from 'react'

import type { DiffChunk } from '@shared/types'

import styles from './InlineDiffChunk.module.css'

type InlineDiffChunkProps = {
  chunk: DiffChunk
}

function lineClassName(line: string): string {
  if (line.startsWith('+')) return styles.addLine
  if (line.startsWith('-')) return styles.removeLine
  if (line.startsWith('@@')) return styles.hunkHeader
  return styles.contextLine
}

export function InlineDiffChunk({ chunk }: InlineDiffChunkProps): ReactElement {
  const lines = useMemo(() => chunk.content.split('\n'), [chunk.content])

  return (
    <div className={styles.chunk}>
      <div className={styles.header}>
        <span className={styles.filename}>{chunk.filename}</span>
        <span className={styles.badge}>{chunk.language}</span>
        {chunk.startLine > 0 && <span className={styles.badge}>L{chunk.startLine}</span>}
      </div>
      <pre className={styles.body}>
        <code>
          {lines.map((line, i) => (
            <span key={i} className={lineClassName(line)}>
              {line}
              {i < lines.length - 1 ? '\n' : ''}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
