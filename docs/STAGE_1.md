# Stage 1: Repo Selection + Status UI (Milestone 1)

## Goal

Implement the core workflow: select a repo folder, parse git status, display staged/unstaged file lists with hover actions, and support stage/unstage operations. No diff viewer yet — just the right pane and basic app shell.

## Status: Not Started

## Prerequisites

- Stage 0 complete (scaffolding, tooling, empty shell app)

## Deliverables

### 1.1 — Git Runner Service

- [ ] `src/main/git-runner.ts`: utility to spawn git commands
  - Typed result: `{ ok: true, data: T } | { ok: false, error: string }`
  - Captures stdout, stderr, exit code
  - Validates paths are within repo root
  - Timeout support (configurable, default ~10s)
- [ ] `git rev-parse --show-toplevel` to validate a folder is a git repo
- [ ] `git rev-parse HEAD` to get current HEAD SHA
- [ ] Unit tests for the git runner

### 1.2 — Porcelain v2 Status Parser

- [ ] `src/main/parse-status.ts`: parse `git status --porcelain=v2 -z` output
- [ ] Handle record types:
  - `1` — ordinary changed entries (X Y fields)
  - `2` — renamed/copied entries (includes original path)
  - `u` — unmerged entries (treat as modified for MVP)
  - `?` — untracked entries
  - `!` — ignored entries (skip)
- [ ] Map X/Y status codes to `FileChange` objects
  - A file can appear in BOTH staged and unstaged lists (if X and Y both indicate changes)
  - Split into `{ staged: FileChange[], unstaged: FileChange[] }`
- [ ] Handle NUL-separated fields correctly (especially renames with extra path)
- [ ] Thorough unit tests with real porcelain v2 output samples

### 1.3 — IPC Contract

- [ ] Define IPC channels and types in `src/shared/ipc.ts`:
  - `repo.selectFolder` → returns `string | null` (path)
  - `repo.open` → validates and opens repo, returns repo info
  - `git.getStatus` → returns `{ staged: FileChange[], unstaged: FileChange[] }`
  - `git.stageFile(path)` → success/error
  - `git.unstageFile(path)` → success/error
  - `git.stageAll()` → success/error
  - `git.unstageAll()` → success/error
- [ ] Register IPC handlers in `src/main/ipc-handlers.ts`
- [ ] Expose typed API in preload

### 1.4 — Repo Selection UI

- [ ] Top bar component with:
  - Folder picker button (triggers native OS folder dialog)
  - Repo name + path display (subtle, truncated)
  - Refresh button (manual trigger)
- [ ] `repoSlice` Redux state:
  - `openRepo` thunk: calls `repo.selectFolder()` → `repo.open()` → `refreshStatus()`
  - Loading/error states
- [ ] Handle non-git folders gracefully (show error message)

### 1.5 — File Lists (Staged & Unstaged)

- [ ] Right pane layout: two stacked sections
- [ ] Section header component:
  - Title + count badge (e.g., "Staged (3)")
  - Bulk action button: "Stage All" / "Unstage All"
- [ ] File list component (virtualized with `react-window`):
  - Each row shows:
    - Status badge (A/M/D/R/?) with color coding
    - File path (truncate middle, keep filename visible)
  - Click row → sets selection in Redux (`selected: { path, section }`)
  - Hover → shows action button (Stage or Unstage)
- [ ] `changesSlice` Redux state:
  - `refreshStatus` thunk
  - `stageFile` / `unstageFile` thunks
  - `stageAll` / `unstageAll` thunks
  - After any action: auto-refresh status
  - Selection tracking

### 1.6 — File Watcher

- [ ] `src/main/file-watcher.ts`: chokidar watcher
  - Watch the repo worktree (excluding `.git/`, `node_modules/`)
  - On change: send IPC event to renderer
  - Debounce: 200-400ms
- [ ] Renderer listens for the event and dispatches `refreshStatus()`
- [ ] Watcher starts on repo open, stops on repo change/close

### 1.7 — Selection Persistence

- [ ] After stage/unstage: if the file still exists in the new status, keep it selected (it may have moved from unstaged to staged or vice versa)
- [ ] If the file no longer appears in either list: clear selection
- [ ] After stage all / unstage all: clear selection

### 1.8 — Styling (Right Pane)

- [ ] Dark theme applied (using CSS variables from Stage 0)
- [ ] Right pane has clear visual separation from main area
- [ ] Section headers styled (compact, clear)
- [ ] File rows styled:
  - Status badge colors (green=A, yellow=M, red=D, blue=R, gray=?)
  - Hover state (background highlight + action button appears)
  - Selected state (accent border or background)
- [ ] Scrollbar styling (dark, thin)
- [ ] Main area shows a placeholder message ("Select a file to view diff") until Stage 2

## Acceptance Criteria

- Can open a folder picker and select a git repository
- Non-git folders show an error message
- Staged and unstaged files are listed correctly
- File counts are accurate in section headers
- Clicking a file selects it (visual highlight)
- Hovering shows Stage/Unstage button
- Stage/Unstage individual files works
- Stage All / Unstage All works
- File watcher detects external changes and refreshes the list
- Selection persists across refresh when the file still exists
- File lists scroll smoothly with many files (virtualized)
- No white flash on load — fully dark

## Testing

- **Unit**: porcelain v2 parser (comprehensive), git runner (mocked), Redux slices
- **E2E**: open a test repo, verify file lists populate, stage/unstage a file

## Notes

- The main/left area will be a placeholder in this stage. It just needs to show "Select a file to view diff" or similar.
- The porcelain v2 parser is the most critical piece to get right — invest heavily in test cases. Edge cases include renames, files with spaces, files in subdirectories, and mixed staged+unstaged state on the same file.
- Path truncation for display: show `...` in the middle, always keep the filename and immediate parent visible.
