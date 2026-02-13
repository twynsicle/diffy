import type { ReactElement } from 'react'

import type { NarrativeReview, PrData } from '@shared/types'

import { MarkdownText } from './MarkdownText'
import styles from './SummaryCard.module.css'

type SummaryCardProps = {
  review: NarrativeReview
  prData: PrData
}

export function SummaryCard({ review, prData }: SummaryCardProps): ReactElement {
  const totalAdditions = prData.files.reduce((sum, f) => sum + f.additions, 0)
  const totalDeletions = prData.files.reduce((sum, f) => sum + f.deletions, 0)

  return (
    <div className={styles.summary} id="chapter-__summary__">
      <h2 className={styles.title} id="chapter-heading-__summary__" tabIndex={-1}>
        {review.prTitle}
      </h2>
      <div className={styles.meta}>
        <span className={styles.author}>{prData.author}</span>
        <span className={styles.branches}>
          <code>{prData.baseRefName}</code>
          <span className={styles.arrow}>&larr;</span>
          <code>{prData.headRefName}</code>
        </span>
      </div>
      <div className={styles.stats}>
        <span>{prData.files.length} files</span>
        <span className={styles.additions}>+{totalAdditions}</span>
        <span className={styles.deletions}>-{totalDeletions}</span>
      </div>
      {prData.body && (
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Description</h3>
          <MarkdownText text={prData.body} />
        </section>
      )}
      <section className={styles.section}>
        <h3 className={styles.sectionHeading}>AI Overview</h3>
        <MarkdownText text={review.overviewSummary} />
      </section>
    </div>
  )
}
