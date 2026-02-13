import type { ReactElement } from 'react'

import type { NarrativeChapter } from '@shared/types'

import styles from './ChapterCard.module.css'
import { InlineDiffChunk } from './InlineDiffChunk'
import { MarkdownText } from './MarkdownText'

type ChapterCardProps = {
  chapter: NarrativeChapter
  index: number
}

export function ChapterCard({ chapter, index }: ChapterCardProps): ReactElement {
  return (
    <article
      id={`chapter-${chapter.id}`}
      className={styles.card}
      aria-labelledby={`chapter-heading-${chapter.id}`}
      style={{ animationDelay: `${String(index * 50)}ms` }}
    >
      <div className={styles.header}>
        <span className={styles.badge} aria-hidden="true">{index + 1}</span>
        <h2
          id={`chapter-heading-${chapter.id}`}
          className={styles.title}
          tabIndex={-1}
        >
          {chapter.title}
        </h2>
      </div>
      <MarkdownText text={chapter.summary} />
      {chapter.diffChunks.map((chunk, i) => (
        <InlineDiffChunk key={i} chunk={chunk} />
      ))}
    </article>
  )
}
