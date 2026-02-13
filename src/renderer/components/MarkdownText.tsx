import { type ReactElement, type ReactNode, useMemo } from 'react'

import styles from './MarkdownText.module.css'

type MarkdownTextProps = {
  text: string
}

type InlineSegment =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }

function parseInline(text: string): ReactNode[] {
  const segments: InlineSegment[] = []
  const regex = /\*\*(.+?)\*\*|`([^`]+)`/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    if (match[1]) {
      segments.push({ type: 'bold', value: match[1] })
    } else if (match[2]) {
      segments.push({ type: 'code', value: match[2] })
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.map((seg, i) => {
    switch (seg.type) {
      case 'bold':
        return <strong key={i}>{seg.value}</strong>
      case 'code':
        return (
          <code key={i} className={styles.inlineCode}>
            {seg.value}
          </code>
        )
      default:
        return <span key={i}>{seg.value}</span>
    }
  })
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'code'; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const sections = text.split(/\n\n+/)

  for (const section of sections) {
    const trimmed = section.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('```')) {
      const lines = trimmed.split('\n')
      const content = lines.slice(1, lines.length - (lines[lines.length - 1] === '```' ? 1 : 0)).join('\n')
      blocks.push({ type: 'code', content })
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, text: trimmed.slice(4) })
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: trimmed.slice(3) })
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, text: trimmed.slice(2) })
    } else if (trimmed.split('\n').every((line) => line.startsWith('- '))) {
      const items = trimmed.split('\n').map((line) => line.slice(2))
      blocks.push({ type: 'list', items })
    } else {
      blocks.push({ type: 'paragraph', text: trimmed })
    }
  }

  return blocks
}

function renderBlock(block: Block, index: number): ReactElement {
  switch (block.type) {
    case 'heading': {
      const Tag = (['h1', 'h2', 'h3'] as const)[block.level - 1]
      return <Tag key={index}>{parseInline(block.text)}</Tag>
    }
    case 'code':
      return (
        <pre key={index} className={styles.codeBlock}>
          <code>{block.content}</code>
        </pre>
      )
    case 'list':
      return (
        <ul key={index}>
          {block.items.map((item, i) => (
            <li key={i}>{parseInline(item)}</li>
          ))}
        </ul>
      )
    case 'paragraph':
      return <p key={index}>{parseInline(block.text)}</p>
  }
}

export function MarkdownText({ text }: MarkdownTextProps): ReactElement {
  const blocks = useMemo(() => parseBlocks(text), [text])

  return <div className={styles.container}>{blocks.map(renderBlock)}</div>
}
