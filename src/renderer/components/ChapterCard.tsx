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
    <section id={`chapter-${chapter.id}`} className={styles.card}>
      <div className={styles.header}>
        <span className={styles.badge}>{index + 1}</span>
        <h2 className={styles.title}>{chapter.title}</h2>
      </div>
      <MarkdownText text={chapter.summary} />
      {chapter.diffChunks.map((chunk, i) => (
        <InlineDiffChunk key={i} chunk={chunk} />
      ))}
    </section>
  )
}
