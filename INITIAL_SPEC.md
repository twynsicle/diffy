Got it. Here’s the updated, agent-handoff spec for **Diffy** with your changes baked in (Redux Toolkit, hover actions, context menu, no toggle, wrap button, and *unstaged compares worktree ↔ index*).

---

## Project: Diffy

A lightweight macOS desktop diff reviewer optimized for reviewing AI-generated working-tree changes. GitKraken-like UI: right pane with Staged/Unstaged file lists and a large Monaco diff viewer. Focus is speed and a tight “review → stage → iterate” loop.

### Goals

* Fast + responsive on large repos.
* Workflow: changes land in filesystem → you review diffs → stage files you approve → iterate.
* UI resembles GitKraken (dark, compact, crisp).

### Non-Goals

* Commit creation, push/pull, branch management, history graph, blame
* Partial staging (hunks/lines)
* Merge conflict resolution UI
* Repo-wide search

---

## Tech Stack

* Electron
* React
* TypeScript
* Monaco Editor (Diff Editor)
* Redux Toolkit
* Git CLI via `child_process.spawn`
* chokidar for file watching
* react-window (or similar) for list virtualization

---

## UX / Layout (GitKraken-ish)

### Window Layout

* Top bar:

  * Repo selector (folder picker)
  * Repo name + path (subtle)
  * Refresh icon / spinner (optional)
* Main content: two columns

  * **Main/left**: Monaco Diff Editor
  * **Right pane**: two stacked sections

    * **Staged** (top)
    * **Unstaged** (bottom)

### Section Header (Staged / Unstaged)

* Title + count (e.g., “Staged (3)”)
* Button on the right:

  * Staged: **Unstage All**
  * Unstaged: **Stage All**

### File Lists

* Virtualized scroll list in each section.
* Each row:

  * Status badge (A/M/D/R/?)
  * Path display (truncate middle; keep filename visible)
  * On hover: show primary action button:

    * Unstaged row hover action: **Stage**
    * Staged row hover action: **Unstage**
* On click: selects that row and loads diff.
* Right-click: context menu with:

  * **Discard Changes** (enabled when applicable)
  * **Delete File** (enabled when applicable)
  * (Optional: “Reveal in Finder” nice-to-have, not MVP)

### Diff View

* Monaco Diff Editor fills the main area.
* Above diff: small toolbar (right-aligned is fine):

  * **Wrap Lines** toggle button (persist per-session or in config)
* The diff shown depends on where the user clicked:

  * Clicked in **Unstaged** list → show *worktree vs index* diff content
  * Clicked in **Staged** list → show *index vs HEAD* diff content

No explicit “staged/unstaged toggle” control exists.

### Dark Mode

* Default dark theme resembling GitKraken.
* Optionally follow system dark mode; MVP can just be dark.

---

## Core Git Semantics (Critical)

Diffy uses **three states**:

* **HEAD**: last committed
* **Index**: staged
* **Worktree**: unstaged working directory

### Diff Rules

**When selecting an UNSTAGED item**
Show diff between **Index ↔ Worktree** (what’s newly changed since you last staged):

* original = content from **Index**
* modified = content from **Worktree**

**When selecting a STAGED item**
Show diff between **HEAD ↔ Index** (what is currently staged to commit):

* original = content from **HEAD**
* modified = content from **Index**

This is intentionally *not* worktree vs HEAD for unstaged.

---

## Git Status Retrieval

Use porcelain v2:

* `git -C <repo> status --porcelain=v2 -z`

Parse NUL-separated records into file changes.

Represent each path potentially in both staged and unstaged sections if both X and Y indicate changes.

### FileChange model

```ts
type Section = "staged" | "unstaged";

type FileChange = {
  path: string;
  origPath?: string;      // for rename
  displayPath: string;    // "old → new" if rename

  X?: string; // index status from porcelain v2
  Y?: string; // worktree status from porcelain v2
  isUntracked: boolean;
  isRenamed: boolean;
  isDeleted: boolean;

  section: Section; // derived based on whether it appears in staged or unstaged list
};
```

---

## Actions & Context Menu Behavior

### Hover actions (only)

* In Unstaged list: **Stage**
* In Staged list: **Unstage**

### Right-click context menu actions

* **Discard Changes**
* **Delete File**

#### Enablement rules

* Discard Changes:

  * enabled for tracked files with worktree modifications
  * enabled for untracked files (acts like delete)
* Delete File:

  * enabled for any file entry (tracked or untracked)
* Always show confirmation modal for Delete.

---

## Git Commands

### Repo root

* `git -C <folder> rev-parse --show-toplevel`

### Stage / Unstage

**Stage file**

* `git -C <repo> add -- <path>`

**Unstage file**

* `git -C <repo> restore --staged -- <path>`
* fallback: `git -C <repo> reset -q HEAD -- <path>`

**Stage all**

* `git -C <repo> add -A`

**Unstage all**

* `git -C <repo> reset -q` (simplest, reliable)

### Discard Changes (right click)

**If tracked**

* Discard worktree changes:

  * `git -C <repo> restore -- <path>`
* If file is deleted in worktree and you want to restore it, above covers it.
  **If untracked**
* Delete from filesystem (see Delete below)

### Delete File (right click + confirm)

* If tracked:

  * `git -C <repo> rm -- <path>`
* If untracked:

  * filesystem delete (`fs.rm`, recursive, force)

> Note: MVP can use `fs.rm`. Nice-to-have: move to Trash on macOS using `trash` npm package.

---

## Diff Content Strategy (Monaco)

Monaco wants `original` + `modified` text blobs.

### Content sources

* **HEAD version**: `git -C <repo> show HEAD:<path>`
* **Index version**: `git -C <repo> show :<path>`
* **Worktree version**: read from filesystem

### Mapping by selection

**Selected from Unstaged list (Index ↔ Worktree)**

* original = `git show :<path>` (if exists, else `""`)
* modified = read `<repo>/<path>` from disk (if exists, else `""`)

**Selected from Staged list (HEAD ↔ Index)**

* original = `git show HEAD:<path>` (if exists, else `""`)
* modified = `git show :<path>` (if exists, else `""`)

### Edge cases

* Added untracked:

  * Unstaged selection: original `""`, modified from disk
* Added staged:

  * Staged selection: original `""` (HEAD missing), modified from index
* Deleted staged:

  * Staged selection: original from HEAD, modified `""` (index missing)
* Deleted unstaged (worktree deleted but index has it):

  * Unstaged selection: original from index, modified `""`
* Renames:

  * MVP: show “old → new” label in UI if detectable.
  * Diff content best-effort:

    * Unstaged selection: index `:<newPath>` vs worktree `<newPath>`
    * If index only knows oldPath, fallback to oldPath.
  * Accept that rename diffs may be imperfect in MVP.

### Binary detection

When getting content:

* If file bytes contain `\0` (null), treat as binary.
* Or if `git show` indicates binary / fails in a way implying binary.
  Behavior:
* Replace editor with placeholder: “Binary file — cannot display diff”
* Provide button: “Reveal in Finder” (nice-to-have) or “Open externally” (nice-to-have)

---

## Performance Requirements

* Debounced status refresh (200–400ms).
* Do not compute diffs except for currently selected item.
* Virtualize file lists.
* Use `spawn` not `exec`.
* Cache:

  * status results
  * diff content results keyed by `(path, section, headSha, indexSha?)`
* After each status refresh, fetch:

  * `git -C <repo> rev-parse HEAD` (headSha for caching)

---

## Electron Architecture / Security

* `contextIsolation: true`
* preload exposes a typed API (no Node in renderer)
* validate all requested paths are inside repo root
* Main process:

  * git runner service
  * chokidar watcher
  * IPC handlers:

    * `repo.selectFolder()`
    * `repo.open(repoRoot)`
    * `git.getStatus()`
    * `git.stageFile(path)`
    * `git.unstageFile(path)`
    * `git.stageAll()`
    * `git.unstageAll()`
    * `git.discard(path)`
    * `git.delete(path)`
    * `git.getDiffContent({ path, section })`  // section determines mapping above
    * `fs.readFileText(path)` as needed (or handled inside getDiffContent)

---

## Redux Toolkit State Shape

Slices:

### `repoSlice`

* `repoRoot: string | null`
* `repoDisplayName: string`
* `status: "idle" | "loading" | "error"`
* `error?: string`

### `changesSlice`

* `staged: FileChange[]`
* `unstaged: FileChange[]`
* `selected?: { path: string; section: Section }`
* `statusUpdatedAt: number`

### `diffSlice`

* `loading: boolean`
* `wrapEnabled: boolean`
* `original: string`
* `modified: string`
* `language?: string`
* `isBinary?: boolean`
* `error?: string`

### Async thunks

* `openRepo(folder)`
* `refreshStatus()`
* `stageFile(path)`
* `unstageFile(path)`
* `stageAll()`
* `unstageAll()`
* `discard(path)`
* `deleteFile(path)`
* `loadDiff({ path, section })`

On success of any action, trigger `refreshStatus()` and then `loadDiff()` if selection still exists.

---

## Interaction Rules

* Clicking a row sets selection to `{path, section}` and loads diff accordingly.
* After staging/unstaging a file, keep selection on that file if it still exists (may move sections).
* Wrap toggle updates Monaco diff editor options and stores in Redux.

---

## Milestones

### M1: Repo + Status UI

* Folder select, repo validation
* Parse porcelain v2 status
* Staged/Unstaged lists + counts
* Hover stage/unstage buttons
* Stage all / unstage all

### M2: Diff Viewer

* Monaco diff editor integrated
* Correct content mapping:

  * unstaged selection = index vs worktree
  * staged selection = head vs index
* Wrap toggle

### M3: Context menu + Polish

* Right-click menu with discard/delete + confirm modal
* chokidar refresh + debounce
* Error toasts
* Virtualized lists
* Theming pass (GitKraken-like)

---

## Acceptance Criteria

* Unstaged selection shows exactly “what changed since the last staging state” (index ↔ worktree).
* Staged selection shows exactly what is staged compared to HEAD (head ↔ index).
* Stage/Unstage all works.
* Hover action buttons only for stage/unstage.
* Discard/delete only via right-click.
* Wrap toggle works.

---

If you want the agent to move even faster, I can also append:

* a minimal repo structure (`/main`, `/preload`, `/renderer`, `/shared`)
* a porcelain v2 parser reference (patterns to parse `1`, `2`, `u` records)
* an IPC type contract file (`shared/ipc.ts`) so TS stays end-to-end typed.
