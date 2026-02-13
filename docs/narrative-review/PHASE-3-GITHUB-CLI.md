# Phase 3: GitHub CLI Integration

## Context

The narrative review needs PR data — metadata, file changes, and diff text. This phase adds a `gh` CLI runner (following the existing `git-runner.ts` pattern), PR URL parsing, IPC channels for fetching PR data, and the initial UI for entering a PR URL and viewing the fetched summary.

## Prerequisites

- Phase 1 (Mode Switching) — provides the NarrativeShell component to host the PR input UI

## New types

In `src/shared/types.ts`:
```typescript
export type PrFileChange = {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied'
  additions: number
  deletions: number
  patch: string
}

export type PrData = {
  owner: string
  repo: string
  number: number
  title: string
  body: string
  author: string
  baseRef: string
  headRef: string
  files: PrFileChange[]
  diffText: string
}

export type PrReference = {
  owner: string
  repo: string
  number: number
}
```

## New IPC channels

In `src/shared/ipc.ts`:
```typescript
GH_CHECK_INSTALLED: 'gh.checkInstalled',
GH_FETCH_PR: 'gh.fetchPr',
```

Extend `DiffyApi`:
```typescript
checkGhInstalled: () => Promise<Result<boolean>>
fetchPr: (ref: PrReference) => Promise<Result<PrData>>
```

## New files

### `src/main/gh-runner.ts`
Follows `git-runner.ts` pattern exactly — `spawn`-based, `Result<T>` return, timeout handling.

```typescript
function runGh(args: string[], timeoutMs?: number): Promise<Result<string>>
```

- Default timeout: 30s (PR fetches can be slower than local git)
- No `-C` flag (gh uses `--repo` for repo targeting)

Higher-level functions:
- `checkGhInstalled(): Promise<Result<boolean>>` — runs `gh --version`
- `fetchPrData(ref: PrReference): Promise<Result<PrData>>` — orchestrates three calls:
  1. `gh pr view {n} --repo {owner}/{repo} --json title,body,author,baseRefName,headRefName` — PR metadata
  2. `gh api repos/{owner}/{repo}/pulls/{n}/files --paginate` — file list with patches (JSON)
  3. `gh pr diff {n} --repo {owner}/{repo}` — full unified diff text

  Assembles results into `PrData`. If any call fails, returns the error.

### `src/shared/parse-pr-url.ts`
Utility to parse GitHub PR URLs:
```typescript
export function parsePrUrl(url: string): PrReference | null
```

Handles:
- `https://github.com/owner/repo/pull/123`
- `https://github.com/owner/repo/pull/123/files` (trailing paths)
- `http://github.com/...` (http variant)
- Returns `null` for anything else

### `src/shared/parse-pr-url.test.ts`
Unit tests covering valid URLs, invalid URLs, edge cases (trailing slashes, query params, non-GitHub URLs).

### `src/renderer/store/narrative-slice.ts`
New Redux slice for the entire narrative feature state.

State:
```typescript
type NarrativeState = {
  prUrl: string
  prData: PrData | null
  prLoading: boolean
  prError: string | null
  ghInstalled: boolean | null  // null = not yet checked
}
```

Async thunks:
- `checkGhInstalled` — calls `window.api.checkGhInstalled()`
- `fetchPr(ref: PrReference)` — calls `window.api.fetchPr(ref)`

Reducers:
- `setPrUrl(state, action: PayloadAction<string>)`
- `clearPr(state)` — resets prData/prError

Selectors:
- `selectPrData`, `selectPrLoading`, `selectPrError`, `selectPrUrl`, `selectGhInstalled`

### `src/renderer/components/PrInput.tsx` + `PrInput.module.css`
URL input bar for the narrative shell.

- Text input with placeholder "https://github.com/owner/repo/pull/123"
- "Fetch" button (disabled while loading or if URL is empty)
- Validates URL format using `parsePrUrl` on submission; shows inline error for invalid URLs
- Loading spinner on the button during fetch
- Enter key submits

### `src/renderer/components/PrSummary.tsx` + `PrSummary.module.css`
Displays fetched PR metadata. Shown below PrInput after successful fetch.

- PR title (large heading)
- Author, base branch → head branch
- File count, total additions (+), total deletions (-)
- File list preview (first ~10 files with status badges, matching existing FileRow status colors)

## Modified files

### `src/shared/types.ts`
Add `PrFileChange`, `PrData`, `PrReference` type exports.

### `src/shared/ipc.ts`
Add GH channel constants. Extend `DiffyApi` with `checkGhInstalled`, `fetchPr`.

### `src/preload/index.ts`
Wire up the 2 new API methods.

### `src/main/ipc-handlers.ts`
Register handlers for `GH_CHECK_INSTALLED` and `GH_FETCH_PR`. The fetch handler takes a `PrReference` argument, calls `fetchPrData()`, returns `Result<PrData>`.

### `src/renderer/store/index.ts`
Register `narrativeReducer` in the store.

### `src/renderer/components/NarrativeShell.tsx`
Replace the Phase 1 placeholder with:
- Check `ghInstalled` on mount (dispatch `checkGhInstalled()`). If `false`, show a warning: "GitHub CLI (gh) is not installed or not authenticated"
- Render `<PrInput />` at the top
- When `prData` is loaded, render `<PrSummary />` below
- When `prError`, show error message

## Verification

- [ ] Narrative mode shows PR URL input field
- [ ] Warning appears if `gh` CLI is not installed
- [ ] Valid GitHub PR URL → fetches and displays PR metadata
- [ ] Invalid URL → inline validation error
- [ ] Network/gh CLI failures → error toast
- [ ] Loading spinner during fetch
- [ ] Enter key submits the URL
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (parse-pr-url tests)
