# Phase 6: Polish, Loading States & Edge Cases

## Context

With the full feature functional (Phases 1-5), this phase adds production-quality polish: a proper generation overlay with cancel support, large PR handling, persisted PR URL, accessibility, animations, and error recovery.

## Prerequisites

- Phases 1-5 complete

## Generation overlay & cancel

### `src/renderer/components/GeneratingOverlay.tsx` + `GeneratingOverlay.module.css`
Full-area overlay shown during narrative generation.

- Pulsing animation or typing indicator (not a plain spinner)
- Streaming text preview (last few lines of LLM output, scrolling)
- "Cancel" button to abort generation
- Fades in on generation start

### New IPC channel
```
LLM_CANCEL_GENERATION: 'llm.cancelGeneration'
```

### Cancel flow
- Renderer dispatches cancel → IPC to main → `AbortController.abort()` on the fetch
- Main process sends `LLM_STREAM_ERROR` with "Generation cancelled"
- Renderer resets generating state, shows the pre-generation UI

### Modified files for cancel
- `src/shared/ipc.ts` — add channel
- `src/preload/index.ts` — add `cancelGeneration` method
- `src/main/ipc-handlers.ts` — register handler, store `AbortController` reference
- `src/main/anthropic-client.ts` — accept and use `AbortSignal`
- `src/renderer/store/narrative-slice.ts` — add `cancelGeneration` thunk

## Large PR handling

In `src/main/narrative-prompt.ts`:
- Improve token estimation (count characters / 4 as rough heuristic)
- If total prompt would exceed ~80k tokens:
  - Keep all file metadata intact
  - Keep full patches for files with < 200 lines changed
  - Truncate large file patches: keep first 50 + last 50 lines with `[... N lines truncated ...]`
  - Add a note in the prompt: "Some large files were truncated. Focus your narrative on the available content."
- Send a flag back to the renderer so it can show a warning toast: "Large PR — some file diffs were truncated for the AI"

## Persisted PR URL

Extend `src/main/persisted-state.ts`:
- Add `lastPrUrl?: string` to persisted state
- Add `getLastPrUrl(): string | null` and `setLastPrUrl(url: string): void`

New IPC channels:
```
SETTINGS_GET_LAST_PR_URL: 'settings.getLastPrUrl'
SETTINGS_SET_LAST_PR_URL: 'settings.setLastPrUrl'
```

Pre-fill the PrInput with the last used URL on app launch (in narrative mode).

## Accessibility

- `ChapterNav`: `role="navigation"`, `aria-label="Chapter navigation"`
- `ChapterCard`: render as `<article>` elements with `aria-labelledby` pointing to the title
- Keyboard focus: when navigating to a chapter (click or keyboard), move focus to the chapter heading
- Screen reader announcements: use `aria-live="polite"` region to announce chapter changes
- InlineDiffChunk: `role="figure"`, `aria-label="Diff for {filename}"`

## Visual polish

### Animations
- Chapter cards fade in when the review first loads (staggered, 50ms delay between each)
- Smooth scroll transitions between chapters
- GeneratingOverlay fades in/out

### Theme variables (add to `src/renderer/styles/theme.css`)
These may already exist from Phase 5; verify and add if missing:
```css
--bg-chapter: #1e1e30;
--diff-add-bg: rgba(166, 227, 161, 0.1);
--diff-remove-bg: rgba(243, 139, 168, 0.1);
--diff-add-text: #a6e3a1;
--diff-remove-text: #f38ba8;
```

## Error recovery

- **Network timeout during `gh` calls**: Retry once with doubled timeout (60s)
- **Anthropic 529 (overloaded)**: Show "API is busy, retrying in N seconds" with countdown, auto-retry after delay
- **Malformed LLM response**: Show "Generation failed — unexpected format" with option to "Retry" or "View Raw Response" (modal showing the raw text)

## Empty states

- PR with no file changes: "This PR has no file changes to review"
- LLM returns zero chapters: "Unable to generate narrative for this PR — try a different one"
- Very small PR (1-2 files, < 20 lines): Generate normally but allow fewer chapters (minimum 2)

## Verification

- [ ] Generation overlay appears with streaming text and cancel button
- [ ] Cancel stops generation mid-stream, returns to pre-generation state
- [ ] Large PR (500+ files) shows truncation warning, generates successfully
- [ ] Last PR URL pre-fills on next app launch
- [ ] Screen reader can navigate chapters (test with VoiceOver)
- [ ] Keyboard focus moves to chapter heading on navigation
- [ ] Chapter cards animate in on first load
- [ ] Network errors show retry option
- [ ] Malformed LLM response shows clear error with retry
- [ ] Empty PR shows appropriate message
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
