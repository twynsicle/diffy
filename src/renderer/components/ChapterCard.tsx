import type { ReactElement } from 'react'

import type { NarrativeChapter } from '@shared/types'

import styles from './ChapterCard.module.css'
import { InlineDiffChunk } from './InlineDiffChunk'

type ChapterCardProps = {
  chapter: NarrativeChapter
}

export function ChapterCard({ chapter }: ChapterCardProps): ReactElement {
  return (
    <article
      id={`chapter-${chapter.id}`}
      className={styles.card}
      aria-labelledby={`chapter-heading-${chapter.id}`}
    >
      <h2
        id={`chapter-heading-${chapter.id}`}
        className={styles.title}
        tabIndex={-1}
      >
        {chapter.title}
      </h2>
      {chapter.diffChunks.map((chunk, i) => (
        <InlineDiffChunk key={i} chunk={chunk} />
      ))}
    </article>
  )
}
