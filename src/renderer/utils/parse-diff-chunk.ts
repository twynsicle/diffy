export type DiffSides = {
  original: string
  modified: string
}

export function parseDiffChunk(content: string): DiffSides {
  const lines = content.split('\n')
  const originalLines: string[] = []
  const modifiedLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('@@')) {
      continue
    } else if (line.startsWith('-')) {
      originalLines.push(line.slice(1))
    } else if (line.startsWith('+')) {
      modifiedLines.push(line.slice(1))
    } else {
      // Context line (may have leading space)
      const text = line.startsWith(' ') ? line.slice(1) : line
      originalLines.push(text)
      modifiedLines.push(text)
    }
  }

  return {
    original: originalLines.join('\n'),
    modified: modifiedLines.join('\n'),
  }
}
