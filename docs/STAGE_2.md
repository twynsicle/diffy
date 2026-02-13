# Stage 2: Diff Viewer (Milestone 2)

## Goal

Integrate Monaco Editor's diff view into the main area. Show the correct diff content based on which file is selected and whether it's in the staged or unstaged list. Handle edge cases (new files, deleted files, renames, binary files).

## Status: Not Started

## Prerequisites

- Stage 1 complete (repo selection, file lists, stage/unstage working)

## Deliverables

### 2.1 — Monaco Editor Integration

- [ ] Install `monaco-editor` (or `@monaco-editor/react` wrapper)
- [ ] Configure Monaco to load correctly with electron-vite
  - Monaco workers need special bundling configuration
  - May need to configure `MonacoWebpackPlugin` equivalent for Vite or use the ESM build
- [ ] Create `DiffView` component wrapping `MonacoDiffEditor`
- [ ] Configure editor defaults:
  - Read-only (both sides)
  - Dark theme (matching app theme)
  - Minimap off
  - Line numbers on
  - Scrollbar styling to match app
- [ ] Verify the editor renders and displays a hardcoded diff

### 2.2 — Diff Content IPC

- [ ] Add IPC channel: `git.getDiffContent({ path, section })`
- [ ] Main process implementation:
  - **Unstaged** (Index vs Worktree):
    - `original` = `git show :<path>` (index content)
    - `modified` = read file from filesystem
  - **Staged** (HEAD vs Index):
    - `original` = `git show HEAD:<path>` (HEAD content)
    - `modified` = `git show :<path>` (index content)
- [ ] Handle `git show` failures gracefully:
  - Exit code 128 / "does not exist" → return empty string (file is new)
  - Other errors → surface as error
- [ ] Return type: `{ original: string, modified: string, language: string, isBinary: boolean }`

### 2.3 — Language Detection

- [ ] Detect language from file extension for Monaco syntax highlighting
- [ ] Map common extensions to Monaco language IDs:
  - `.ts`/`.tsx` → `typescript`
  - `.js`/`.jsx` → `javascript`
  - `.json` → `json`
  - `.md` → `markdown`
  - `.css` → `css`
  - `.html` → `html`
  - `.py` → `python`
  - `.rs` → `rust`
  - `.go` → `go`
  - etc. (cover common languages, fallback to `plaintext`)
- [ ] Set language on Monaco model when loading diff

### 2.4 — Binary File Detection

- [ ] When fetching content: check for null bytes (`\0`) in the first ~8KB
- [ ] If binary detected: set `isBinary: true` in response
- [ ] Renderer shows a placeholder instead of Monaco:
  - Message: "Binary file — cannot display diff"
  - File path displayed
  - Status badge (A/M/D)

### 2.5 — Diff Redux State

- [ ] `diffSlice` implementation:
  - `loadDiff` async thunk
  - `loading` state (show spinner/skeleton in editor area)
  - `original` and `modified` strings
  - `language` for syntax highlighting
  - `isBinary` flag
  - `error` state
  - `wrapEnabled` boolean
- [ ] Clear diff state when selection is cleared
- [ ] Cancel in-flight diff load if selection changes before it completes

### 2.6 — Wrap Toggle

- [ ] Small toolbar above the diff editor (right-aligned)
- [ ] "Wrap" toggle button
  - Toggles `wordWrap` option on Monaco editor
  - Visual state: pressed/active appearance when enabled
  - Persisted in Redux state (session-lifetime, not across restarts for MVP)
- [ ] Update Monaco options reactively when toggle changes

### 2.7 — Edge Cases

- [ ] **New untracked file (unstaged)**: original = `""`, modified = file contents from disk
- [ ] **New staged file**: original = `""` (HEAD has nothing), modified = index content
- [ ] **Deleted file (staged)**: original = HEAD content, modified = `""`
- [ ] **Deleted file (unstaged, worktree deleted)**: original = index content, modified = `""`
- [ ] **Renamed file (staged)**: display "old → new" in UI, diff old path HEAD vs new path index
- [ ] **Renamed file (unstaged)**: index content vs worktree content at new path
  - Fallback: if index only has old path, use old path for original
- [ ] **Empty file**: valid case, show empty diff (not an error)
- [ ] **Very large file**: Monaco handles this, but consider a warning threshold (>1MB?)

### 2.8 — Diff Caching

- [ ] Cache diff content keyed by `(path, section, headSha)`
  - After each status refresh, get HEAD SHA via `git rev-parse HEAD`
  - Invalidate cache when HEAD SHA changes
- [ ] Cache is in-memory, cleared on repo change
- [ ] Don't cache errors

### 2.9 — Loading States

- [ ] While diff is loading: show a subtle loading indicator in the editor area
- [ ] While diff has an error: show error message with file path context
- [ ] When no file is selected: show centered message "Select a file to view diff"

## Acceptance Criteria

- Clicking an unstaged file shows Index vs Worktree diff in Monaco
- Clicking a staged file shows HEAD vs Index diff in Monaco
- New (added) files show empty left side, content on right
- Deleted files show content on left, empty right side
- Binary files show a placeholder message instead of the editor
- Syntax highlighting works correctly based on file extension
- Wrap toggle works and persists within the session
- Switching files rapidly doesn't cause stale diffs to display
- Large files render without crashing
- Loading state is visible during diff fetch

## Testing

- **Unit**: diff content mapping logic, language detection, binary detection, cache invalidation
- **E2E**: select a file and verify diff content matches expected, test new/deleted file edge cases

## Notes

- Monaco editor bundling with Vite/Electron is a known pain point. Budget extra time for 2.1. The `@monaco-editor/react` wrapper may simplify things. Alternatively, Monaco's ESM distribution can be loaded with `vite-plugin-monaco-editor`.
- The diff cancellation (2.5) is important for UX — without it, rapidly clicking through files will cause diffs to appear out of order.
- Rename detection quality depends on git's own rename detection. For MVP, best-effort is fine.
