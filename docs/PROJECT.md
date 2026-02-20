# Diffy — Architecture & Design

## Overview

Diffy is an Electron desktop app for macOS with two modes:

1. **Diff Review** — Review filesystem diffs against git state, stage/unstage files, and iterate. GitKraken-like dark UI.
2. **Narrative Review** — Generate AI-powered chapter-based code review summaries from GitHub PRs, local branch diffs, or uncommitted changes.

## Non-Goals

- Commit creation, push/pull, branch management, history graph, blame
- Partial staging (hunks/lines) — entire files only
- Merge conflict resolution UI
- Repo-wide search

## Process Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Main Process                             │
│                                                               │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  Git Runner   │  │  File Watcher  │  │  IPC Handlers    │ │
│  │  (spawn-based)│  │  (1s polling)  │  │  (38 channels)   │ │
│  └──────────────┘  └────────────────┘  └──────────────────┘ │
│                                                               │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  Anthropic    │  │  Claude CLI    │  │  GitHub CLI      │ │
│  │  API Client   │  │  Client        │  │  Runner (gh)     │ │
│  └──────────────┘  └────────────────┘  └──────────────────┘ │
│                                                               │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  Persisted    │  │  Secure        │  │  Narrative       │ │
│  │  State (JSON) │  │  Storage (enc) │  │  Prompt Builder  │ │
│  └──────────────┘  └────────────────┘  └──────────────────┘ │
│                           │                                   │
│                      IPC Bridge                               │
│                           │                                   │
├───────────────────────────┼───────────────────────────────────┤
│                      Preload                                  │
│                 (contextBridge)                                │
│            Exposes typed API on window                         │
├───────────────────────────┼───────────────────────────────────┤
│                   Renderer Process                            │
│                                                               │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  React UI     │  │  Redux Store   │  │  Monaco Diff     │ │
│  │  Components   │  │  (7 slices)    │  │  Editor          │ │
│  └──────────────┘  └────────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## App Modes

The `mode` Redux slice holds the active mode: `'diff-review' | 'narrative-review'`.

### Diff Review Mode

The original mode. `App.tsx` renders `<MainContent />` (Monaco diff view) + `<SidePane />` (staged/unstaged file trees). The side pane uses `use-split-pane` for the vertical split between staged/unstaged sections and `use-resizable-panel` for horizontal panel width.

### Narrative Review Mode

`App.tsx` renders `<NarrativeShell />` which contains:
- `SourceSelect` — choose between GitHub PR, branch diff, or uncommitted changes
- `PrInput` — enter GitHub PR URL (for PR source)
- `NarrativeToolbar` — generate/cancel/regenerate buttons
- `NarrativeView` — chapter cards with insights and inline diffs
- `ChapterNav` / `ChapterNavBar` — chapter navigation sidebar
- `FileTree` (compact variant) — file tree for the PR/diff files (shared with diff-review mode)
- `DiffPanel` — Monaco diff view for selected file (reused from diff-review mode)

Mode switching is done via `TopBar`, which dispatches `setMode()`.

## Narrative Review Architecture

### Data Sources

Narrative review supports three sources (`NarrativeSource` type):

1. **`github-pr`** — Fetches PR data via `gh` CLI (metadata, file list, diff)
2. **`branch-diff`** — Compares current branch vs detected default branch (`main`/`master`) using local git
3. **`uncommitted`** — Compares HEAD vs worktree (staged + unstaged + untracked files)

All three produce a `PrData` object with the same shape:
```
{ title, body, author, baseRefName, headRefName, files: PrFileChange[], diff: string }
```

### Generation Flow

```
User selects source and clicks "Generate"
  → renderer dispatches startNarrativeGeneration(prData) thunk
  → IPC: llm.generateNarrative
  → main process selects provider (API or CLI) from settings
  → narrative-prompt.ts builds system + user prompts:
      - Filters files via ai-file-filter (lock files, snapshots, user patterns)
      - Truncates diff to ~80k tokens if needed (warns via LLM_TRUNCATION_WARNING)
  → Provider streams response:
      API: Anthropic Messages API with SSE streaming
      CLI: claude -p subprocess with stdout streaming
  → Each text chunk → IPC: llm.streamChunk → renderer appends to streamText
  → On complete:
      - Main process parses <narrative_review> JSON from accumulated text
      - IPC: llm.streamComplete with NarrativeReview object
      - Renderer dispatches setReview() → renders chapters
  → On error: IPC: llm.streamError → renderer shows error
```

### NarrativeReview Data Shape

```ts
type NarrativeReview = {
  prTitle: string
  overviewSummary: string          // 2-4 sentence high-level summary
  chapters: NarrativeChapter[]     // 2-12 chapters
}

type NarrativeChapter = {
  id: string                       // Slug like 'auth-middleware'
  title: string                    // McKinsey-style actionable takeaway sentence
  insights: Insight[]              // 1-3 per chapter
  diffChunks: DiffChunk[]          // Relevant unified diff snippets
}

type Insight = {
  type: 'context' | 'rationale' | 'highlight' | 'reference'
  text: string
}

type DiffChunk = {
  filename: string
  language: string
  startLine: number
  content: string                  // Unified diff with +/- prefixes
}
```

### Narrative Keyboard Navigation

When in narrative mode with a review loaded, these keys navigate chapters:
- `←` / `→` or `Space` / `Shift+Space` — previous/next chapter
- `Home` / `End` — first chapter / summary section
- `1`–`9` — jump to chapter by number

## AI Integration

### Anthropic API Client (`anthropic-client.ts`)

- **Model**: `claude-sonnet-4-20250514`
- **Max tokens**: 16,000
- **Streaming**: SSE via `fetch` with manual line-by-line parsing of `data:` events
- **Timeout**: 2 minutes (AbortController)
- **529 retry**: On API overload, waits 15s with countdown chunks sent to renderer, then retries once
- **Error handling**: HTTP status → user-friendly messages (401 → invalid key, 429 → rate limited, 529 → overloaded)
- **Cancellation**: External AbortSignal from `ipc/narrative-handlers.ts` AbortController map

### Claude CLI Client (`claude-cli-client.ts`)

- **Invocation**: Uses `spawnRunner` with `claude -p --system-prompt ... --tools ""` and user prompt piped via stdin
- **Model**: Optional custom model via `--model` flag (from settings)
- **Timeout**: 3 minutes
- **Streaming**: stdout `data` events → chunks
- **Output parsing**: Same `parseNarrativeReview()` parser as API client

### Provider Selection

Settings store `aiProvider: 'api' | 'cli'`. The `llm.generateNarrative` IPC handler reads this and routes to the appropriate client. API mode requires an API key (stored encrypted). CLI mode requires the `claude` binary to be installed.

## GitHub Integration

### gh CLI Runner (`gh-runner.ts`)

Uses `spawnRunner` (never `exec`). Three API calls per PR fetch:

1. `gh pr view <num> --repo <owner/repo> --json title,body,author,baseRefName,headRefName` — PR metadata
2. `gh api repos/<owner/repo>/pulls/<num>/files --paginate` — file list with patches
3. `gh pr diff <num> --repo <owner/repo>` — full unified diff

**Pagination fix**: `gh api --paginate` can concatenate JSON arrays as `[...][...]`. The parser detects and fixes this by replacing `][` with `,`.

**Timeout**: 30s default, doubles on retry for timeout failures.

### Local Diff Builder (`local-diff-builder.ts`)

For branch-diff and uncommitted sources (no `gh` needed):

- **Branch diff**: `git diff <base>...HEAD` where base is auto-detected (`main`, `master`, `origin/main`, `origin/master`)
- **Uncommitted diff**: `git diff HEAD` for tracked files + synthetic patches for untracked files (reads from filesystem, skips binary/large files)

Both produce `PrData` objects matching the same shape as GitHub PR data.

## Settings & Persistence

### Persisted State (`persisted-state.ts`)

JSON file at `<userData>/persisted-state.json`. Stores:
- `lastRepoPath` — auto-reopened on launch
- `lastPrUrl` — pre-filled in PR input
- `excludedFilePatterns` — user-defined file exclusion patterns for AI
- `aiProvider` — `'api'` or `'cli'` (default: `'api'`)
- `cliModel` — custom model override for CLI provider

### Secure Storage (`secure-storage.ts`)

Anthropic API key stored at `<userData>/api-key.enc` using Electron's `safeStorage.encryptString()` / `decryptString()`. The key is never stored in plaintext.

### Settings Dialog

Opened via `Cmd+,` or the TopBar settings button. Manages:
- Anthropic API key (set/clear)
- AI provider selection (API vs CLI)
- CLI model override
- File exclusion patterns for AI processing

## Redux State Shape

```
store
├── repo
│   ├── repoRoot: string | null
│   ├── repoDisplayName: string
│   ├── status: 'idle' | 'loading' | 'error'
│   └── error?: string
├── changes
│   ├── staged: FileChange[]
│   ├── unstaged: FileChange[]
│   ├── selected?: { path, section, origPath? }
│   ├── statusUpdatedAt: number
│   └── refreshing: boolean
├── diff
│   ├── loading: boolean
│   ├── fetching: boolean
│   ├── wrapEnabled: boolean
│   ├── original: string
│   ├── modified: string
│   ├── language: string
│   ├── isBinary: boolean
│   ├── error?: string
│   └── currentRequestId?: string
├── ui
│   ├── toasts: Toast[]          // { id, message, variant: 'error' | 'info' }
│   ├── confirmModal: { open, title, message, onConfirmAction? }
│   └── settingsOpen: boolean
├── mode
│   └── activeMode: 'diff-review' | 'narrative-review'
└── narrative
    ├── source: 'github-pr' | 'branch-diff' | 'uncommitted' | null
    ├── prUrl: string
    ├── prData: PrData | null
    ├── prLoading: boolean
    ├── prError: string | null
    ├── ghInstalled: boolean | null
    ├── review: NarrativeReview | null
    ├── generating: boolean
    ├── generateError: string | null
    ├── streamText: string
    ├── activeChapterId: string | null
    ├── selectedFile: string | null
    ├── cancelling: boolean
    └── refreshingFiles: boolean
├── settings
│   ├── aiProvider: 'api' | 'cli'
│   ├── hasApiKey: boolean
│   ├── cliModel: string
│   ├── cliInstalled: boolean | null
│   ├── excludedPatterns: string[]
│   ├── lastPrUrl: string | null
│   ├── loading: boolean
│   └── loaded: boolean
```

## Data Flows

### Status Refresh Flow (Diff Review)

```
File change on disk (or manual Cmd+R)
  → file-watcher.ts sends statusChanged event every 1s (polling)
  → use-status-listener dispatches refreshStatus() thunk
  → thunk calls window.api.getStatus() (IPC)
  → main runs: git status --porcelain=v2 -z
  → parse-status.ts parses output into FileChange[]
  → returns { staged: FileChange[], unstaged: FileChange[] }
  → changesSlice reducer updates state (with selection persistence logic)
  → React re-renders file trees
```

### Diff Loading Flow (Diff Review)

```
User clicks file row in FileTree
  → changesSlice.selectFile({ path, section })
  → use-diff-loader detects selection change
  → aborts any in-flight diff request
  → dispatches loadDiff({ path, section, origPath? })
  → IPC: git.getDiffContent
  → main process determines content sources:
      unstaged: original = git show :<path>, modified = fs.read(path)
      staged:   original = git show HEAD:<path>, modified = git show :<path>
  → returns { original, modified, language, isBinary }
  → diffSlice reducer updates state (guards on requestId to ignore stale)
  → Monaco DiffEditor renders with new content
```

### Narrative Diff Loading Flow

```
User clicks file in FileTree (compact variant)
  → narrativeSlice.setSelectedFile(filename)
  → use-narrative-diff-loader detects selection change
  → dispatches loadDiff with ref-based parameters:
      branch-diff:  baseRef = defaultBranch, headRef = 'HEAD'
      uncommitted:  baseRef = 'HEAD', headRef = 'WORKTREE'
      github-pr:    baseRef = origin/<base>, headRef = origin/<head>
  → IPC: git.getDiffContent with baseRef/headRef
  → main process uses git show <ref>:<path> for both sides
      (or fs.read for WORKTREE headRef)
  → DiffPanel renders Monaco diff
```

### Stage/Unstage Flow

```
User clicks hover action (Stage/Unstage)
  → dispatch stageFile(path) or unstageFile(path)
  → thunk calls window.api.stageFile(path) or unstageFile(path)
  → main runs: git add -- <path> or git reset HEAD -- <path>
  → on success: next polling cycle triggers refreshStatus
  → changesSlice selection persistence logic:
      - If file still in same section → keep selected
      - If file left section but section has files → select next file at same index
      - If section empty → clear selection
```

## Git Semantics

Diffy operates on three states: **HEAD** (committed), **Index** (staged), **Worktree** (filesystem).

- **Unstaged diff** = Index vs Worktree (`git show :<path>` vs filesystem read)
- **Staged diff** = HEAD vs Index (`git show HEAD:<path>` vs `git show :<path>`)

This is intentionally NOT worktree vs HEAD for unstaged — it shows what changed since the last staging state.

### Diff Content Mapping

| Selection | Original | Modified |
|---|---|---|
| Unstaged file | `git show :<path>` (index) | `fs.read(path)` (worktree) |
| Staged file | `git show HEAD:<path>` (HEAD) | `git show :<path>` (index) |
| New untracked | `""` (empty) | worktree content |
| New staged | `""` (empty, HEAD missing) | index content |
| Deleted staged | HEAD content | `""` (index missing) |
| Deleted unstaged | index content | `""` (worktree deleted) |
| Narrative (ref-based) | `git show <baseRef>:<path>` | `git show <headRef>:<path>` or `fs.read` for WORKTREE |

### Git Commands Reference

| Operation | Command |
|---|---|
| Validate repo | `git -C <folder> rev-parse --show-toplevel` |
| Get status | `git -C <repo> status --porcelain=v2 -z` |
| Stage file | `git -C <repo> add -- <path>` |
| Unstage file | `git -C <repo> reset HEAD -- <path>` |
| Stage all | `git -C <repo> add -A` |
| Unstage all | `git -C <repo> reset HEAD` |
| Discard (tracked) | `git -C <repo> restore -- <path>` |
| Delete (tracked) | `git -C <repo> rm -f -- <path>` |
| Delete (untracked) | `fs.rm(path, { recursive: true, force: true })` |
| Get HEAD content | `git -C <repo> show HEAD:<path>` |
| Get index content | `git -C <repo> show :<path>` |
| Get ref content | `git -C <repo> show <ref>:<path>` |
| Branch diff | `git -C <repo> diff <base>...HEAD` |
| Uncommitted diff | `git -C <repo> diff HEAD` |
| List untracked | `git -C <repo> ls-files --others --exclude-standard` |
| Detect default branch | `git rev-parse --verify main` (then master, origin/main, origin/master) |

## IPC Channel Reference

All channels defined in `src/shared/ipc.ts`. The `DiffyApi` type in the same file defines the renderer-side typed API.

### Repository (3 channels)
- `repo.getLast` — Get last opened repo path from persisted state
- `repo.selectFolder` — Show native folder picker dialog
- `repo.open` — Validate git repo and start watching

### Git Operations (10 channels)
- `git.getStatus` — Parse `porcelain=v2` status
- `git.stageFile` / `git.unstageFile` — Stage/unstage single file
- `git.stageAll` / `git.unstageAll` — Stage/unstage all
- `git.getDiffContent` — Get diff content (section-based or ref-based)
- `git.discardFile` / `git.deleteFile` — Destructive file operations
- `git.getBranchDiff` — Build PrData from branch diff
- `git.getUncommittedDiff` — Build PrData from uncommitted changes

### Watcher (1 channel)
- `watcher.statusChanged` — Main→renderer event (polling trigger)

### Shortcuts (3 channels)
- `shortcut.openRepo` / `shortcut.refresh` / `shortcut.openSettings` — Menu accelerator events

### Settings (12 channels)
- `settings.getApiKey` / `settings.setApiKey` / `settings.hasApiKey` / `settings.clearApiKey` — API key (encrypted)
- `settings.getLastPrUrl` / `settings.setLastPrUrl` — Last PR URL
- `settings.getExcludedPatterns` / `settings.setExcludedPatterns` — AI file exclusion patterns
- `settings.getAiProvider` / `settings.setAiProvider` — AI provider selection
- `settings.getCliModel` / `settings.setCliModel` — CLI model override

### GitHub (2 channels)
- `gh.checkInstalled` — Check if `gh` CLI is available
- `gh.fetchPr` — Fetch PR metadata, files, and diff

### LLM / Narrative (6 channels)
- `llm.generateNarrative` — Start narrative generation (returns immediately, streams async)
- `llm.streamChunk` — Main→renderer: text chunk from LLM
- `llm.streamComplete` — Main→renderer: parsed NarrativeReview
- `llm.streamError` — Main→renderer: error message
- `llm.cancelGeneration` — Abort active generation
- `llm.truncationWarning` — Main→renderer: diff was truncated for AI

### Claude CLI (1 channel)
- `claudeCli.checkInstalled` — Check if `claude` binary is available

## UX Behavior

### Window Layout

- **Title bar**: Hidden inset (macOS native), traffic lights on left
- **Top bar**: Repo selector (folder picker), repo name + path, mode toggle, settings button
- **Main area**: Layout depends on mode:
  - *Diff Review*: Monaco Diff Editor (left) + file lists pane (right)
  - *Narrative Review*: Chapter navigation (left) + narrative content (center) + file tree (right, optional)
- **Status bar**: Bottom bar showing status info
- **Resizable panes**: Both horizontal (panel width) and vertical (staged/unstaged ratio) with drag handles

### File List Interactions (Diff Review)

- **Click row**: Selects file and loads diff
- **Hover**: Shows primary action button (Stage for unstaged, Unstage for staged)
- **Right-click**: Opens context menu with Discard Changes / Delete File
- Status badges: A (added), M (modified), D (deleted), R (renamed), ? (untracked)
- **File tree**: Hierarchical with path compression (e.g., `src/main` collapses single-child folders)

### Context Menu Enablement

| Action | Enabled When |
|---|---|
| Discard Changes | Tracked files with worktree modifications, or untracked files (acts as delete) |
| Delete File | Any file entry (tracked or untracked) |

- Delete always requires a confirmation modal
- Discard on untracked files also shows confirmation ("will delete the file")

### Selection Persistence

- After stage/unstage: if file left section but section still has files, select next file at same index
- If no files remain in section: clear selection
- After stage all / unstage all: clear selection

### Narrative Review Interactions

- **Source selection**: Choose GitHub PR, Branch Diff, or Uncommitted via SourceSelect
- **PR input**: Enter GitHub PR URL, validates format, fetches PR data
- **Generate**: Sends PR data to AI, shows streaming overlay with elapsed time
- **Cancel**: Aborts in-flight generation
- **Chapter navigation**: Click chapter in nav bar, or use keyboard shortcuts
- **File selection**: Click file in FileTree to view its diff in Monaco
- **Summary section**: Special `__summary__` section shows overview and file stats
- **Raw response**: Debug modal showing raw LLM output (accessible from toolbar)

### Settings Dialog

Opened via `Cmd+,` or settings icon in TopBar. Contains:
- AI Provider toggle (Anthropic API vs Claude CLI)
- API Key input (set/clear, stored encrypted)
- CLI Model override (optional)
- File exclusion patterns (comma-separated, for filtering AI input)

### Keyboard Shortcuts

| Shortcut | Action | Mode |
|---|---|---|
| `Cmd+O` | Open folder | Both |
| `Cmd+R` | Refresh status | Both |
| `Cmd+,` | Open Settings | Both |
| `←` / `→` | Previous/next chapter | Narrative |
| `Space` / `Shift+Space` | Next/previous chapter | Narrative |
| `Home` / `End` | First chapter / summary | Narrative |
| `1`–`9` | Jump to chapter by number | Narrative |

### Error Handling UX

- Toast notifications appear for errors and info messages
- Auto-dispatched by `errorToastMiddleware` for all rejected thunks
- Manual toasts for info messages (e.g., truncation warnings)
- Stacks multiple toasts

## Performance Strategy

- Polling-based status refresh (1s interval) — simple and reliable
- Only compute diff content for the currently selected file (lazy loading)
- File trees built with path compression (single-child folder merging)
- `use-diff-loader` aborts in-flight requests when selection changes (prevents stale diffs)
- `diffSlice` guards on `requestId` to ignore stale fulfilled actions
- `spawnRunner` utility centralizes `spawn` boilerplate (timeout, SIGTERM, ENOENT, stdin, streaming, AbortSignal) — used by git-runner, gh-runner, and claude-cli-client
- Narrative prompt truncates diff to ~80k tokens (320k chars) with smart per-patch truncation

## Packaging & Distribution

- **Tool**: electron-builder
- **Targets**: macOS DMG + zip
- **Bundle ID**: `com.diffy.app`
- **Category**: `public.app-category.developer-tools`
- **Production hardening**:
  - Redux DevTools disabled in production
  - Electron DevTools disabled in production
  - Content-Security-Policy headers set
  - No source maps in distributed app
- **Code signing**: Not implemented (unsigned apps show Gatekeeper warning; right-click → Open to bypass)
- **Auto-update**: Not implemented

## Key Design Decisions

### Why spawn over exec?

`exec` buffers all output into a string, has a default maxBuffer limit, and runs through a shell (injection risk). `spawn` streams output, has no buffer limit, and runs the binary directly. The shared `spawnRunner` utility (`src/main/spawn-runner.ts`) extracts the common boilerplate (Promise wrapper, `settled` guard, timeout/SIGTERM, ENOENT detection, stdin piping, streaming callbacks, AbortSignal support) so that `git-runner`, `gh-runner`, and `claude-cli-client` each focus only on their domain-specific logic.

### Why porcelain v2 with -z?

Porcelain v2 (`--porcelain=v2`) provides structured, machine-parseable output with separate X/Y status codes. The `-z` flag uses NUL separators instead of newlines, which correctly handles filenames with spaces or special characters.

### Why Redux Toolkit over lighter state management?

RTK provides structured async thunk patterns that map well to IPC calls, and DevTools integration is valuable during development. The seven-slice model has clear boundaries between repo management, diff review, narrative review, settings, and UI state.

### Why CSS Modules over other approaches?

Zero runtime overhead, native scoping, straightforward for a dark-themed app with a focused design. No need for dynamic theming complexity — Diffy is dark-only.

### Why polling instead of chokidar?

Polling with `setInterval` is simpler, more predictable across filesystems, and avoids native dependency issues with chokidar on different macOS versions. The 1s interval is sufficient for a review-focused workflow.

### Why two AI providers?

The Anthropic API provides direct control and works with any API key. The Claude CLI option allows users who have Claude Code installed to use their existing authentication and billing without needing a separate API key. Both produce the same structured output via the same prompt.

### Why not partial staging (hunks/lines)?

Diffy is optimized for reviewing AI-generated changes where you typically accept or reject entire files. This keeps the UI simple and the git command surface small.

## Security Model

1. **contextIsolation: true** — Renderer has no access to Node.js APIs.
2. **Typed preload bridge** — Only explicitly exposed functions are available.
3. **Path validation** — Every path argument in IPC handlers is resolved and checked against the repo root. Rejects path traversal attempts.
4. **No shell execution** — `spawn` with explicit args array, never string interpolation into commands.
5. **Confirmation for destructive actions** — Delete and discard require user confirmation via modal.
6. **Encrypted API key** — Stored using Electron `safeStorage` (OS keychain-backed encryption), never in plaintext.
7. **Input validation** — IPC handlers validate all incoming arguments before processing.
