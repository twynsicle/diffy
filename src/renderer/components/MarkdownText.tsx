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
  | { type: 'hr' }

function isListLine(line: string): boolean {
  return /^[-*] /.test(line) || /^- \[[ x]\] /i.test(line)
}

function stripListPrefix(line: string): string {
  // Handle "- [x] text" and "- [ ] text" checkbox styles
  const checkbox = line.match(/^[-*] \[([ x])\] (.*)$/i)
  if (checkbox) {
    const checked = checkbox[1].toLowerCase() === 'x'
    return `${checked ? '[x]' : '[ ]'} ${checkbox[2]}`
  }
  // Handle "- text" and "* text"
  return line.replace(/^[-*] /, '')
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'code', content: codeLines.join('\n') })
      i++ // skip closing ```
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, text: line.slice(4).trim() })
      i++
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: line.slice(3).trim() })
      i++
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, text: line.slice(2).trim() })
      i++
      continue
    }

    // List items (- or * or checkbox)
    if (isListLine(line)) {
      const items: string[] = []
      while (i < lines.length && isListLine(lines[i])) {
        items.push(stripListPrefix(lines[i]))
        i++
      }
      blocks.push({ type: 'list', items })
      continue
    }

    // Paragraph: collect consecutive non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].trim().startsWith('```') &&
      !isListLine(lines[i]) &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^\*\*\*+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') })
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
    case 'hr':
      return <hr key={index} className={styles.hr} />
  }
}

export function MarkdownText({ text }: MarkdownTextProps): ReactElement {
  const blocks = useMemo(() => parseBlocks(text), [text])

  return <div className={styles.container}>{blocks.map(renderBlock)}</div>
}
