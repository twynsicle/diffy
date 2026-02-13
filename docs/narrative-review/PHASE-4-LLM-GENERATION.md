# Phase 4: LLM Narrative Generation

## Context

With PR data fetched (Phase 3) and an API key stored (Phase 2), this phase sends the PR data to the Anthropic Claude API and receives a structured narrative review. The main process calls the API (keeping the key server-side), streams progress to the renderer, and parses the structured output into chapters.

## Prerequisites

- Phase 2 (Settings) — provides the stored API key
- Phase 3 (GitHub CLI) — provides the `PrData` to send to the LLM

## New types

In `src/shared/types.ts`:
```typescript
export type DiffChunk = {
  filename: string
  language: string
  startLine: number
  content: string  // unified diff text for this chunk
}

export type NarrativeChapter = {
  id: string
  title: string
  summary: string       // explanatory markdown text
  diffChunks: DiffChunk[]
}

export type NarrativeReview = {
  prTitle: string
  overviewSummary: string  // high-level PR summary
  chapters: NarrativeChapter[]
}
```

## New IPC channels

In `src/shared/ipc.ts`:
```typescript
LLM_GENERATE_NARRATIVE: 'llm.generateNarrative',
LLM_STREAM_CHUNK: 'llm.streamChunk',
LLM_STREAM_COMPLETE: 'llm.streamComplete',
LLM_STREAM_ERROR: 'llm.streamError',
```

Extend `DiffyApi`:
```typescript
generateNarrative: (prData: PrData) => Promise<Result<string>>  // returns requestId
onNarrativeStreamChunk: (callback: (chunk: string) => void) => () => void
onNarrativeStreamComplete: (callback: (review: NarrativeReview) => void) => () => void
onNarrativeStreamError: (callback: (error: string) => void) => () => void
```

## New files

### `src/main/anthropic-client.ts`
Calls the Anthropic Messages API using `fetch` (no SDK dependency).

```typescript
export async function generateNarrative(
  prData: PrData,
  apiKey: string,
  onChunk: (text: string) => void,
): Promise<Result<NarrativeReview>>
```

- Endpoint: `https://api.anthropic.com/v1/messages`
- Streaming enabled (`stream: true`)
- Parses SSE `event: content_block_delta` events for incremental text
- Calls `onChunk` with each text delta (renderer shows progress)
- On stream end, accumulates full response text
- Extracts JSON from within `<narrative_review>` XML tags in the response
- Parses JSON into `NarrativeReview` type
- 120s timeout via `AbortController`
- Returns `Result<NarrativeReview>`

Error handling:
- 401 → `{ ok: false, error: 'Invalid API key. Check your key in Settings.' }`
- 429 → `{ ok: false, error: 'Rate limited. Try again in a moment.' }`
- 529 → `{ ok: false, error: 'API is overloaded. Try again shortly.' }`
- Parse failure → `{ ok: false, error: 'Failed to parse narrative from AI response.' }`

### `src/main/narrative-prompt.ts`
Constructs the prompt for Claude.

```typescript
export function buildNarrativePrompt(prData: PrData): { system: string; user: string }
```

**System prompt** instructs Claude to:
- Act as a senior code reviewer giving a narrative walkthrough
- Generate 5-12 chapters (fewer for small PRs, more for large)
- Start with the most important or architectural changes
- Each chapter: clear title, markdown explanatory text (2-4 paragraphs), 1-4 diff chunks
- Diff chunks must be exact subsets of the provided diff (not fabricated)
- Not all files need to appear — focus on what matters for understanding
- Use the PR description and context to inform the narrative
- Output JSON wrapped in `<narrative_review>` tags

**User prompt** includes:
- PR title, author, base→head branch
- PR description/body
- File list with change stats
- Full diff text

**Token management:**
- Estimate token count (~4 chars per token as rough heuristic)
- If diff exceeds ~80k tokens: truncate large file patches (keep first/last N lines with `[... N lines truncated ...]` marker), keep all file metadata, add a note explaining truncation

### `src/renderer/hooks/use-narrative-stream.ts`
Custom hook that subscribes to the three stream IPC events and dispatches corresponding Redux actions.

- `onNarrativeStreamChunk` → dispatches `appendStreamText`
- `onNarrativeStreamComplete` → dispatches `setReview`
- `onNarrativeStreamError` → dispatches `setGenerateError`
- Cleans up subscriptions on unmount

## Modified files

### `src/shared/types.ts`
Add `DiffChunk`, `NarrativeChapter`, `NarrativeReview` type exports.

### `src/shared/ipc.ts`
Add LLM channel constants. Extend `DiffyApi`.

### `src/preload/index.ts`
Add `generateNarrative` invoke method and 3 stream event listeners.

### `src/main/ipc-handlers.ts`
Register `LLM_GENERATE_NARRATIVE` handler:
1. Load API key from `secure-storage.ts` — if missing, return error "No API key configured"
2. Call `generateNarrative(prData, apiKey, onChunk)` from `anthropic-client.ts`
3. `onChunk` callback sends `LLM_STREAM_CHUNK` to renderer
4. On success, send `LLM_STREAM_COMPLETE` with the `NarrativeReview`
5. On failure, send `LLM_STREAM_ERROR` with error message
6. Return `{ ok: true, data: requestId }` immediately (generation happens async)

### `src/renderer/store/narrative-slice.ts`
Extend state:
```typescript
type NarrativeState = {
  // ... existing PR fields from Phase 3 ...
  review: NarrativeReview | null
  generating: boolean
  generateError: string | null
  streamText: string  // accumulated streaming text for progress
}
```

New thunk:
- `generateNarrative(prData: PrData)` — calls `window.api.generateNarrative(prData)`, sets `generating: true`

New reducers:
- `appendStreamText(state, action: PayloadAction<string>)`
- `setReview(state, action: PayloadAction<NarrativeReview>)` — also sets `generating: false`
- `setGenerateError(state, action: PayloadAction<string>)` — also sets `generating: false`
- `clearReview(state)` — resets review/streamText/generateError

### `src/renderer/components/NarrativeShell.tsx`
After PR is loaded (PrSummary visible), show a "Generate Review" button:
- If no API key: clicking shows a toast "Set your API key in Settings first"
- If generating: show loading indicator with streaming text preview
- On completion: display chapter titles and summaries as a simple list (full UI comes in Phase 5)
- On error: show error message with "Retry" button

## Verification

- [ ] "Generate Review" button appears after fetching a PR
- [ ] Clicking without an API key shows helpful toast
- [ ] With valid key, generation starts and shows streaming progress
- [ ] On completion, chapter titles and summaries display as a list
- [ ] Can regenerate by clicking the button again
- [ ] Invalid API key → clear error message
- [ ] Rate limit / overloaded → appropriate error messages
- [ ] Large PRs are truncated (test with a 500+ file PR if possible)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
