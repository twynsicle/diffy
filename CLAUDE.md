# Diffy — Development Guide

A macOS desktop app for reviewing code changes. Two modes: **Workspace** (GitKraken-like staged/unstaged file lists with Monaco diff viewer) and **Narrative Review** (AI-generated chapter-based code review summaries from PRs, branches, or uncommitted changes).

## Tech Stack

- **Runtime**: Electron (with `contextIsolation: true`)
- **Build**: electron-vite (Vite-based)
- **Language**: TypeScript (strict mode)
- **UI**: React 18+
- **State**: Redux Toolkit (7 slices: `repo`, `changes`, `diff`, `ui`, `mode`, `narrative`, `settings`)
- **Editor**: Monaco Editor (Diff Editor mode)
- **Styling**: CSS Modules (`.module.css`), Catppuccin Mocha dark theme
- **Git**: CLI via `child_process.spawn` (never `exec`)
- **AI**: Anthropic Messages API (streaming) or Claude CLI (`claude` subprocess)
- **GitHub**: `gh` CLI for PR fetching
- **File watching**: Polling-based (1s `setInterval`, no chokidar)
- **List virtualization**: react-window
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Packaging**: electron-builder (macOS DMG)

## Build & Run Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with HMR
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run package      # Build + package with electron-builder
```

## Project Structure

```
src/
  main/               # Electron main process (git, AI clients, IPC handlers)
  preload/            # Preload script (typed contextBridge API)
  renderer/
    components/       # Shared/reusable React components (used by both screens)
    screens/
      workspace/      # Workspace screen components (WorkspaceShell, SidePane, SectionHeader, ContextMenu)
      narrative-review/ # Narrative-review screen components (NarrativeShell + 14 children)
    store/            # Redux Toolkit (6 slices + middleware + store config)
    hooks/            # Custom React hooks (11 files)
    utils/            # Pure utility functions (file-tree, truncate-path, parse-diff-chunk)
    styles/           # Global CSS (theme.css, global.css)
    App.tsx           # Root component — mode switch between Workspace and NarrativeReview
    main.tsx          # React entry point
    monaco-setup.ts   # Monaco Editor worker configuration
  shared/             # Types and constants shared across main + renderer
    ipc.ts            # IPC channel names and DiffyApi type (single source of truth)
    types.ts          # Domain types (FileChange, NarrativeReview, PrData, etc.)
    ai-file-filter.ts # Filename exclusion rules for AI processing
    parse-pr-url.ts   # GitHub PR URL parser → PrReference
```

## App Modes

**Workspace** (`workspace`): The original mode. Opens a git repo, shows staged/unstaged file lists, and displays diffs in Monaco Diff Editor. Supports stage/unstage/discard/delete operations.

**Narrative Review** (`narrative-review`): AI-powered mode. Fetches code changes from one of three sources (GitHub PR, branch diff, uncommitted changes), sends them to Claude, and displays a structured review with chapters, insights, and inline diff chunks. See `docs/PROJECT.md` for full architecture.

## Architecture Summary

- **IPC is the boundary** — All git, AI, filesystem, and settings operations happen in the main process. Renderer communicates exclusively via typed IPC.
- **No Node in renderer** — `contextIsolation: true`, preload exposes a typed `api` object on `window`.
- **Path validation** — Main process validates all paths are inside the repo root.
- **Spawn, not exec** — Always `child_process.spawn` with args array for git/CLI commands.
- **Lazy diff loading** — Only compute diff for the currently selected file.
- **Polling-based refresh** — File watcher sends `statusChanged` every 1s via `setInterval` (not chokidar).

For detailed architecture, data flows, and design decisions, see `docs/PROJECT.md`.

## Code Conventions

See `docs/STYLE_GUIDE.md` for detailed conventions. Key rules:

- **Filenames**: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components
- **CSS Modules**: Co-located as `ComponentName.module.css`
- **Imports**: Node built-ins → external packages → internal (with blank line separators)
- **Types**: Prefer `type` over `interface`. Export shared types from `src/shared/`
- **Error handling**: All git/IPC commands must handle failure. Surface errors via Redux state and UI toasts
- **No `any`**: Use `unknown` and narrow. TypeScript strict mode is non-negotiable
- **No default exports**: Named exports everywhere

## Git Semantics

Diffy operates on three states: **HEAD** (committed), **Index** (staged), **Worktree** (filesystem). Unstaged diff = Index vs Worktree. Staged diff = HEAD vs Index. See `docs/PROJECT.md` for the full diff content mapping table and git commands reference.

## Keyboard Shortcuts

| Shortcut       | Action                                          |
| -------------- | ----------------------------------------------- |
| `Cmd+O`        | Open folder                                     |
| `Cmd+R`        | Refresh status                                  |
| `Cmd+,`        | Open Settings                                   |
| `←` / `→`      | Navigate narrative chapters (in narrative mode) |
| `Home` / `End` | Jump to first/last chapter                      |
| `1`–`9`        | Jump to chapter by number                       |

## Module Inventory

### Main Process (`src/main/`)

| File                    | Purpose                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `index.ts`              | Electron app lifecycle, window creation, menu setup                                                          |
| `ipc-handlers.ts`       | Composition root — imports and calls 6 domain `register*Handlers` functions, exports `cleanup()`             |
| `repo-state.ts`         | Shared `currentRepoRoot` getter/setter used by IPC handler modules                                           |
| `spawn-runner.ts`       | Shared `child_process.spawn` wrapper. Handles timeout, SIGTERM, ENOENT, stdin, streaming stdout, AbortSignal |
| `git-runner.ts`         | Execute git commands via `spawnRunner`. Path validation. Returns `Result<string>`                            |
| `parse-status.ts`       | Parse `git status --porcelain=v2 -z` output into `FileChange[]`                                              |
| `file-watcher.ts`       | Polling-based watcher (1s `setInterval`). Sends `statusChanged` events                                       |
| `language-map.ts`       | Map file extensions to Monaco language IDs                                                                   |
| `detect-binary.ts`      | Detect binary files by checking for NUL bytes                                                                |
| `app-menu.ts`           | macOS application menu (File, Edit, Window) with keyboard accelerators                                       |
| `anthropic-client.ts`   | Anthropic Messages API client. Streaming SSE, 529 retry with countdown, 2min timeout                         |
| `claude-cli-client.ts`  | Claude CLI client. Uses `spawnRunner` with `claude -p`, streams stdout, 3min timeout                         |
| `gh-runner.ts`          | GitHub CLI wrapper. Uses `spawnRunner` for `gh pr view`, `gh api`. PR metadata/files/diff, pagination fix    |
| `narrative-prompt.ts`   | Build system+user prompts for narrative generation. Diff truncation (80k token limit), file filtering        |
| `local-diff-builder.ts` | Build `PrData` from local git state (branch diff vs default branch, uncommitted diff vs HEAD)                |
| `persisted-state.ts`    | JSON file persistence in `userData/` (last repo, last PR URL, AI provider, CLI model, excluded patterns)     |
| `secure-storage.ts`     | Anthropic API key storage using Electron `safeStorage` encryption                                            |

### IPC Handler Modules (`src/main/ipc/`)

| File                    | Purpose                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `repo-handlers.ts`      | 3 handlers: get last repo, select folder, open repo                                                                        |
| `git-handlers.ts`       | 7 handlers: status, stage/unstage file/all, discard, delete. Private `isTracked()` helper                                  |
| `diff-handlers.ts`      | 3 handlers: get diff content, branch diff, uncommitted diff. Private `gitShow()` helper                                    |
| `settings-handlers.ts`  | 12 handlers: API key CRUD, last PR URL, AI provider, CLI model, excluded patterns                                          |
| `github-handlers.ts`    | 2 handlers: check `gh` installed, fetch PR data                                                                            |
| `narrative-handlers.ts` | 3 handlers: generate narrative, cancel generation, check Claude CLI. Owns `activeGenerations` state. Returns `{ cleanup }` |

### Shared (`src/shared/`)

| File                | Purpose                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ipc.ts`            | IPC channel name constants (39 channels) and `DiffyApi` type definition                                                                                                                                     |
| `types.ts`          | Domain types: `FileChange`, `Section`, `DiffContent`, `DiffRange`, `DiffChunk`, `FileAtRefRequest`, `FileAtRefResult`, `Result<T>`, `AppMode`, `NarrativeReview`, `PrData`, `PrFileChange`, `Insight`, etc. |
| `ai-file-filter.ts` | Exclude lock files, snapshots, minified assets from AI processing. Supports user-defined patterns                                                                                                           |
| `merge-ranges.ts`   | Merge nearby `DiffRange[]` (within configurable gap) and expand with context lines                                                                                                                          |
| `parse-pr-url.ts`   | Parse `github.com/:owner/:repo/pull/:number` URLs into `PrReference`                                                                                                                                        |

### Renderer — Store (`src/renderer/store/`)

| File                        | Purpose                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                  | Store configuration. Combines 7 slice reducers + error toast middleware                                                    |
| `repo-slice.ts`             | Repo state: `repoRoot`, `displayName`, open status/error                                                                   |
| `changes-slice.ts`          | File changes: `staged[]`, `unstaged[]`, selection with persistence logic                                                   |
| `diff-slice.ts`             | Diff content: `original`, `modified`, `language`, `isBinary`, `wrapEnabled`, `fetching`. Includes `fetchOrigin` thunk      |
| `ui-slice.ts`               | UI state: toasts, confirm modal, settings dialog open/close                                                                |
| `mode-slice.ts`             | App mode: `workspace` or `narrative-review`                                                                                |
| `narrative-slice.ts`        | Narrative state: source, PR data, review, stream text, active chapter, generation status                                   |
| `settings-slice.ts`         | Settings state: AI provider, API key status, CLI model, excluded patterns, last PR URL. All settings IPC wrapped in thunks |
| `error-toast-middleware.ts` | Middleware that auto-creates error toasts from rejected thunks                                                             |

### Renderer — Hooks (`src/renderer/hooks/`)

| File                           | Purpose                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `use-app-dispatch.ts`          | Typed `useDispatch` wrapper                                                     |
| `use-app-selector.ts`          | Typed `useSelector` wrapper                                                     |
| `use-status-listener.ts`       | Listen for `statusChanged` IPC events → dispatch `refreshStatus`                |
| `use-restore-last-repo.ts`     | On mount, re-open last repo from persisted state                                |
| `use-diff-loader.ts`           | Load diff when selection changes; abort in-flight requests                      |
| `use-keyboard-shortcuts.ts`    | Handle `Cmd+O`, `Cmd+R`, `Cmd+,` shortcuts via IPC                              |
| `use-narrative-stream.ts`      | Subscribe to LLM stream chunks/complete/error IPC events                        |
| `use-narrative-keyboard.ts`    | `←`/`→`/`Home`/`End`/`1-9` chapter navigation in narrative mode                 |
| `use-narrative-diff-loader.ts` | Load diff for selected file in narrative mode (branch/uncommitted/PR ref-based) |
| `use-split-pane.ts`            | Drag-to-resize vertical split (staged/unstaged ratio)                           |
| `use-resizable-panel.ts`       | Drag-to-resize horizontal panel width with localStorage persistence             |

### Renderer — Shared Components (`src/renderer/components/`)

`TopBar`, `StatusBar`, `Placeholder`, `ToastContainer`, `ConfirmModal`, `SettingsDialog`, `DiffView`, `DiffPanel`, `FileTree` (both modes), `TreeRow` (both modes, supports `compact` variant)

### Renderer — Workspace Screen (`src/renderer/screens/workspace/`)

`WorkspaceShell`, `SidePane`, `SectionHeader`, `ContextMenu`

### Renderer — Narrative Review Screen (`src/renderer/screens/narrative-review/`)

`NarrativeShell`, `NarrativeView`, `NarrativeToolbar`, `SourceSelect`, `PrInput`, `ChapterCard`, `ChapterNav`, `ChapterNavBar`, `SummaryCard`, `PrSummary`, `InsightCallout`, `InlineDiffChunk`, `MarkdownText`, `GeneratingOverlay`, `RawResponseModal`

### Renderer — Utils (`src/renderer/utils/`)

| File                     | Purpose                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `file-tree.ts`           | Build hierarchical file tree from flat `FileChange[]` with path compression                 |
| `truncate-path.ts`       | Truncate long file paths with ellipsis for display                                          |
| `parse-diff-chunk.ts`    | Split unified diff chunk content into original/modified sides (unused — kept for reference) |
| `generation-duration.ts` | Record and average narrative generation durations in localStorage                           |
| `status-adapter.ts`      | Convert PR file statuses to FileChange objects for unified file tree rendering              |

## Documentation

- `docs/PROJECT.md` — Full architecture, data flows, state shape, IPC contract, UX behavior, design decisions
- `docs/STYLE_GUIDE.md` — Code conventions, naming, patterns, theme reference

## Backward Compatibility

Backward compatibility is **not required**. When changing data shapes, IPC contracts, or persisted formats, update all consumers in the same PR. Do not add fallback paths or compatibility shims for old formats.

## Documentation Maintenance

When a feature is added or changed, update the relevant documentation file(s) in the same PR. CLAUDE.md module inventory and PROJECT.md architecture sections must stay in sync with the codebase.
