# Stage 3: Context Menu + Polish (Milestone 3)

## Goal

Add right-click context menu with discard/delete actions, confirmation modals, error toasts, and a visual polish pass to achieve the GitKraken-like dark aesthetic. This stage transforms the functional app into a polished one.

## Status: Not Started

## Prerequisites

- Stage 2 complete (diff viewer working with correct content mapping)

## Deliverables

### 3.1 — Context Menu

- [ ] Custom context menu component (not Electron native menu — for consistent cross-platform styling)
- [ ] Appears on right-click of any file row
- [ ] Menu items:
  - **Discard Changes** (with enablement rules below)
  - **Delete File** (with enablement rules below)
- [ ] Menu dismisses on click outside, Escape, or scroll
- [ ] Positioned relative to cursor, clamped to viewport

### 3.2 — Discard Changes

- [ ] IPC: `git.discard(path)`
- [ ] Main process logic:
  - **Tracked file**: `git restore -- <path>` (restores from index)
  - **Untracked file**: filesystem delete (`fs.rm`)
- [ ] Enablement:
  - Enabled for tracked files with worktree modifications (unstaged changes)
  - Enabled for untracked files (acts as delete)
  - Disabled for staged-only items with no worktree changes
- [ ] After discard: refresh status, update selection

### 3.3 — Delete File

- [ ] IPC: `git.delete(path)`
- [ ] Main process logic:
  - **Tracked file**: `git rm -- <path>`
  - **Untracked file**: `fs.rm(path, { recursive: true, force: true })`
- [ ] Always requires confirmation (see 3.4)
- [ ] Enablement: enabled for all file entries
- [ ] After delete: refresh status, clear selection if deleted file was selected

### 3.4 — Confirmation Modal

- [ ] Generic confirmation modal component
  - Title, message, confirm button (destructive styling), cancel button
  - Keyboard: Enter to confirm, Escape to cancel
  - Focus trap while open
  - Backdrop overlay
- [ ] Used for:
  - Delete file: "Delete {filename}? This cannot be undone."
  - Discard changes (untracked): "Discard {filename}? This will delete the file."
  - Discard changes (tracked): "Discard changes to {filename}? Unstaged changes will be lost."

### 3.5 — Error Toasts

- [ ] Toast notification system
  - Appears bottom-right or bottom-center
  - Auto-dismiss after ~5 seconds
  - Manual dismiss with X button
  - Supports error and info variants
  - Stacks multiple toasts
- [ ] Surface errors from:
  - Failed git commands (stage, unstage, discard, delete)
  - Failed diff content fetch
  - File watcher errors
  - Repo open failures (in addition to inline error)

### 3.6 — Visual Polish Pass

- [ ] **Overall layout**:
  - Resizable pane divider between diff view and file lists (drag to resize)
  - Sensible default split (e.g., 70/30)
  - Minimum widths for both panes
- [ ] **Top bar**:
  - App icon / title
  - Repo path with subtle styling
  - Folder picker styled as a button
  - Refresh icon with spinner animation during status fetch
- [ ] **File lists**:
  - Smooth hover transitions
  - Status badge color refinement:
    - A (added) → green
    - M (modified) → yellow/orange
    - D (deleted) → red
    - R (renamed) → blue
    - ? (untracked) → gray
  - Selected row accent highlight
  - Empty state when no files: "No staged changes" / "No unstaged changes"
- [ ] **Diff view**:
  - Header showing file path + section context
  - Monaco theme customized to match app (gutter colors, diff highlighting)
  - Smooth transition when switching files
- [ ] **Scrollbars**: thin, dark, consistent across all scrollable areas
- [ ] **Typography**: system font stack, appropriate sizes and weights
- [ ] **Focus indicators**: visible keyboard focus for accessibility

### 3.7 — Keyboard Shortcuts

- [ ] Consider basic shortcuts:
  - `Cmd+O` — Open folder
  - `Cmd+R` — Refresh status
  - Arrow keys — Navigate file list
  - `Enter` — Stage/unstage selected file
  - `Delete/Backspace` — Discard selected file (with confirmation)
- [ ] Display shortcuts in context menu items

### 3.8 — Performance Verification

- [ ] Test with a large repo (1000+ changed files)
- [ ] Verify virtualized lists scroll smoothly
- [ ] Verify debounced refresh doesn't cause flicker
- [ ] Verify diff caching prevents redundant git calls
- [ ] Profile and fix any obvious bottlenecks

## Acceptance Criteria

- Right-click on file row shows context menu with Discard/Delete
- Discard changes works for tracked (restores from index) and untracked (deletes file)
- Delete file works with confirmation modal for all file types
- Error toasts appear for failed operations and auto-dismiss
- Pane divider is draggable
- UI matches a dark, compact, GitKraken-like aesthetic
- Keyboard navigation works for basic file list operations
- Performance is acceptable with 500+ changed files
- No visual glitches, layout jumps, or flash of unstyled content

## Testing

- **Unit**: context menu enablement logic, modal state management
- **E2E**: right-click → discard works, right-click → delete shows confirmation, keyboard shortcuts

## Notes

- The context menu should be a custom React component, not Electron's `Menu.buildFromTemplate`. This gives full control over styling and behavior.
- The pane resizer can use a simple mouse event handler or a library like `react-resizable-panels` or `allotment`.
- GitKraken's color palette for reference: very dark blue-gray backgrounds (#1b1e2b ish), crisp white/light text, blue accents for selection, subtle borders. The exact colors will be tuned in this stage.
- Keyboard shortcuts should be registered via Electron's `globalShortcut` or `accelerator` on menu items (not `document.addEventListener('keydown')`), so they work correctly with Electron's menu bar.
