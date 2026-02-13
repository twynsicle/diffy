import type { ReactElement } from 'react'

import type { Insight, InsightType } from '@shared/types'

import styles from './InsightCallout.module.css'

const TYPE_LABELS: Record<InsightType, string> = {
  context: 'CONTEXT',
  rationale: 'RATIONALE',
  highlight: 'HIGHLIGHT',
  reference: 'REFERENCE',
}

type InsightCalloutProps = {
  insight: Insight
}

export function InsightCallout({ insight }: InsightCalloutProps): ReactElement {
  return (
    <div className={`${styles.callout} ${styles[insight.type]}`}>
      <span className={styles.label}>{TYPE_LABELS[insight.type]}</span>
      <span className={styles.text}>{insight.text}</span>
    </div>
  )
}
