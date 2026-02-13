import type { PrData } from '@shared/types'

const MAX_DIFF_TOKENS = 80_000
const CHARS_PER_TOKEN = 4
const MAX_DIFF_CHARS = MAX_DIFF_TOKENS * CHARS_PER_TOKEN
const KEEP_LINES = 80

function truncateDiff(diff: string): string {
  if (diff.length <= MAX_DIFF_CHARS) {
    return diff
  }

  const patches = diff.split(/(?=^diff --git )/m)
  const patchSizes = patches.map((p, i) => ({ index: i, size: p.length }))
  patchSizes.sort((a, b) => b.size - a.size)

  let totalSize = diff.length
  const truncated = [...patches]

  for (const { index, size } of patchSizes) {
    if (totalSize <= MAX_DIFF_CHARS) break

    const lines = truncated[index].split('\n')
    if (lines.length <= KEEP_LINES * 2 + 5) continue

    const header = lines.slice(0, 4)
    const kept = [
      ...header,
      ...lines.slice(4, 4 + KEEP_LINES),
      `[... ${String(lines.length - KEEP_LINES * 2 - 4)} lines truncated ...]`,
      ...lines.slice(-KEEP_LINES),
    ]

    const newPatch = kept.join('\n')
    totalSize -= size - newPatch.length
    truncated[index] = newPatch
  }

  const result = truncated.join('')
  if (result.length > MAX_DIFF_CHARS) {
    return result.slice(0, MAX_DIFF_CHARS) + '\n[... diff truncated due to size ...]'
  }
  return result
}

export function buildNarrativePrompt(prData: PrData): { system: string; user: string } {
  const system = `You are a senior software engineer reviewing a pull request. Your job is to produce a structured narrative review that organizes the PR changes into logical chapters.

Output a JSON object wrapped in <narrative_review> tags. The JSON must conform to this schema:

{
  "prTitle": "string — the PR title",
  "overviewSummary": "string — 2-4 sentence high-level summary of the entire PR",
  "chapters": [
    {
      "id": "string — unique slug like 'auth-middleware'",
      "title": "string — short chapter title",
      "summary": "string — 1-3 sentence description of what this chapter covers and why",
      "diffChunks": [
        {
          "filename": "string — path of the file",
          "language": "string — programming language",
          "startLine": number,
          "content": "string — relevant code snippet"
        }
      ]
    }
  ]
}

Guidelines:
- Produce 3–12 chapters depending on PR complexity.
- Group related changes together logically (e.g. "API types", "database migration", "UI components").
- Each chapter should tell a coherent story about one aspect of the change.
- Include the most important diff chunks in each chapter to illustrate the changes.
- Keep summaries concise and technical.
- Output ONLY the <narrative_review> JSON tags — no other text.`

  const fileList = prData.files
    .map((f) => `  ${f.status.padEnd(10)} +${String(f.additions)}/-${String(f.deletions)}  ${f.filename}`)
    .join('\n')

  const diff = truncateDiff(prData.diff)

  const user = `# Pull Request: ${prData.title}

**Author**: ${prData.author}
**Branches**: ${prData.headRefName} → ${prData.baseRefName}

## Description
${prData.body || '(no description)'}

## Files Changed (${String(prData.files.length)})
${fileList}

## Full Diff
\`\`\`
${diff}
\`\`\``

  return { system, user }
}
