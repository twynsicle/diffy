# Diffy — Architecture & Design

## Overview

Diffy is a single-purpose Electron app: review filesystem diffs against git state, stage/unstage files, and iterate. It deliberately excludes commit, push, branch, history, and merge features.

## Process Architecture

```
┌─────────────────────────────────────────────────┐
│                  Main Process                     │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ Git Runner   │  │ File Watcher │  │   IPC    │ │
│  │ (spawn-based)│  │ (chokidar)   │  │ Handlers │ │
│  └─────────────┘  └──────────────┘  └─────────┘ │
│         │                │                │       │
│         └────────────────┴────────────────┘       │
│                        │                          │
│                   IPC Bridge                      │
│                        │                          │
├────────────────────────┼──────────────────────────┤
│                   Preload                         │
│              (contextBridge)                      │
│         Exposes typed API on window               │
├────────────────────────┼──────────────────────────┤
│                  Renderer Process                 │
│                                                   │
│  ┌──────────────┐  ┌───────────┐  ┌───────────┐ │
│  │ React UI      │  │  Redux    │  │  Monaco   │ │
│  │ Components    │  │  Store    │  │  Editor   │ │
│  └──────────────┘  └───────────┘  └───────────┘ │
└─────────────────────────────────────────────────┘
```

## Module Responsibilities

### Main Process (`src/main/`)

| Module | Responsibility |
|---|---|
| `git-runner.ts` | Execute git commands via `spawn`. Returns typed results. Validates paths against repo root. |
| `file-watcher.ts` | chokidar instance watching the repo worktree. Emits events to trigger status refresh. |
| `ipc-handlers.ts` | Registers all IPC handlers. Maps renderer requests to git-runner calls. |
| `main.ts` | Electron app lifecycle, window creation, menu setup. |

### Preload (`src/preload/`)

| Module | Responsibility |
|---|---|
| `index.ts` | Uses `contextBridge.exposeInMainWorld` to expose a typed `api` object. |

### Renderer (`src/renderer/`)

| Module | Responsibility |
|---|---|
| `components/` | React components: App shell, FileList, FileRow, DiffView, Toolbar, ContextMenu, ConfirmModal. |
| `store/` | Redux Toolkit store: `repoSlice`, `changesSlice`, `diffSlice`, async thunks. |
| `hooks/` | Custom hooks: `useIpc`, `useContextMenu`, `useKeyboardShortcuts`. |
| `styles/` | Global CSS variables (theme colors), reset styles. |

### Shared (`src/shared/`)

| Module | Responsibility |
|---|---|
| `ipc.ts` | IPC channel name constants and request/response type definitions. Single source of truth for the IPC contract. |
| `types.ts` | Domain types: `FileChange`, `Section`, `DiffContent`, status enums. |

## Data Flow

### Status Refresh Flow

```
File change on disk (or manual refresh)
  → chokidar detects change
  → main process debounces (200-400ms)
  → main sends "status-changed" event to renderer
  → renderer dispatches refreshStatus() thunk
  → thunk calls window.api.getStatus() (IPC)
  → main runs: git status --porcelain=v2 -z
  → main parses output into FileChange[]
  → returns { staged: FileChange[], unstaged: FileChange[] }
  → reducer updates changesSlice
  → React re-renders file lists
```

### Diff Loading Flow

```
User clicks file row
  → dispatch setSelected({ path, section })
  → dispatch loadDiff({ path, section })
  → thunk calls window.api.getDiffContent({ path, section })
  → main process determines content sources:
      unstaged: original = git show :<path>, modified = fs.read(path)
      staged:   original = git show HEAD:<path>, modified = git show :<path>
  → returns { original, modified, language, isBinary }
  → reducer updates diffSlice
  → Monaco DiffEditor renders with new content
```

### Stage/Unstage Flow

```
User clicks hover action (Stage/Unstage)
  → dispatch stageFile(path) or unstageFile(path)
  → thunk calls window.api.stageFile(path) or unstageFile(path)
  → main runs: git add -- <path> or git restore --staged -- <path>
  → on success: dispatch refreshStatus()
  → if selection still valid: dispatch loadDiff() to refresh diff
  → if selected file moved sections: update selection to follow it
```

## Redux State Shape

```
store
├── repo
│   ├── repoRoot: string | null
│   ├── repoDisplayName: string
│   ├── status: "idle" | "loading" | "error"
│   └── error?: string
├── changes
│   ├── staged: FileChange[]
│   ├── unstaged: FileChange[]
│   ├── selected?: { path: string, section: Section }
│   └── statusUpdatedAt: number
└── diff
    ├── loading: boolean
    ├── wrapEnabled: boolean
    ├── original: string
    ├── modified: string
    ├── language?: string
    ├── isBinary?: boolean
    └── error?: string
```

## Key Design Decisions

### Why spawn over exec?

`exec` buffers all output into a string, has a default maxBuffer limit, and runs through a shell (injection risk). `spawn` streams output, has no buffer limit, and runs the binary directly.

### Why porcelain v2 with -z?

Porcelain v2 (`--porcelain=v2`) provides structured, machine-parseable output with separate X/Y status codes. The `-z` flag uses NUL separators instead of newlines, which correctly handles filenames with spaces or special characters.

### Why Redux Toolkit over lighter state management?

The spec calls for RTK. It provides structured async thunk patterns that map well to IPC calls, and DevTools integration is valuable during development. The three-slice model (repo, changes, diff) has clear boundaries.

### Why CSS Modules over other approaches?

Zero runtime overhead, native scoping, straightforward for a dark-themed app with a focused design. No need for dynamic theming complexity — Diffy is dark-only (MVP).

### Why not partial staging (hunks/lines)?

Explicitly a non-goal. Diffy is optimized for reviewing AI-generated changes where you typically accept or reject entire files. This keeps the UI simple and the git command surface small.

## Security Model

1. **contextIsolation: true** — Renderer has no access to Node.js APIs.
2. **Typed preload bridge** — Only explicitly exposed functions are available.
3. **Path validation** — Every path argument in IPC handlers is resolved and checked against the repo root. Rejects path traversal attempts.
4. **No shell execution** — `spawn` with explicit args array, never string interpolation into commands.
5. **Confirmation for destructive actions** — Delete and discard require user confirmation via modal.
