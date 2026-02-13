# Diffy — Development Guide

A lightweight macOS desktop diff reviewer for reviewing AI-generated working-tree changes. GitKraken-like dark UI with staged/unstaged file lists and a Monaco diff viewer.

## Tech Stack

- **Runtime**: Electron (with `contextIsolation: true`)
- **Build**: electron-vite (Vite-based)
- **Language**: TypeScript (strict mode)
- **UI**: React 18+
- **State**: Redux Toolkit (slices: repo, changes, diff)
- **Editor**: Monaco Editor (Diff Editor mode)
- **Styling**: CSS Modules (`.module.css`)
- **Git**: CLI via `child_process.spawn` (never `exec`)
- **File watching**: chokidar
- **List virtualization**: react-window
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Packaging**: electron-builder (macOS DMG)

## Project Structure

```
src/
  main/           # Electron main process (git runner, IPC handlers, chokidar)
  preload/        # Preload scripts (typed API bridge, no Node exposure to renderer)
  renderer/       # React app (components, Redux store, hooks)
    components/   # React components
    store/        # Redux Toolkit slices and store config
    hooks/        # Custom React hooks
    styles/       # Global styles and CSS variables (theme)
  shared/         # Shared types and constants (imported by main + renderer)
    ipc.ts        # IPC channel names and payload types (single source of truth)
    types.ts      # Shared domain types (FileChange, Section, etc.)
```

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

## Architecture Principles

- **IPC is the boundary**: All git operations and filesystem access happen in the main process. The renderer communicates exclusively via typed IPC (defined in `src/shared/ipc.ts`).
- **No Node in renderer**: `contextIsolation: true`, preload exposes a typed API object on `window`.
- **Path validation**: Main process validates all requested paths are inside the repo root before executing.
- **Spawn, not exec**: Always use `child_process.spawn` for git commands (no shell injection risk, better for large output).
- **Lazy diff loading**: Only compute diff content for the currently selected file.
- **Debounced refresh**: File watcher triggers status refresh with 200-400ms debounce.

## Code Conventions

- See `docs/STYLE_GUIDE.md` for detailed conventions.
- **Filenames**: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components.
- **CSS Modules**: Co-located with components as `ComponentName.module.css`.
- **Imports**: Node built-ins, then external packages, then internal (with blank line separators).
- **Types**: Prefer `type` over `interface` for data shapes. Export shared types from `src/shared/`.
- **Error handling**: All git commands must handle failure. Surface errors via Redux state and UI toasts.
- **No `any`**: Use `unknown` and narrow. TypeScript strict mode is non-negotiable.

## Git Semantics (Critical)

Diffy operates on three states: **HEAD** (committed), **Index** (staged), **Worktree** (filesystem).

- **Unstaged diff** = Index vs Worktree (`git show :<path>` vs filesystem read)
- **Staged diff** = HEAD vs Index (`git show HEAD:<path>` vs `git show :<path>`)

This is intentionally NOT worktree vs HEAD for unstaged. See `INITIAL_SPEC.md` for full details.

## Planning Documents

- `INITIAL_SPEC.md` — Original project specification
- `docs/PROJECT.md` — Architecture and design decisions
- `docs/STYLE_GUIDE.md` — Code style conventions
- `docs/STAGE_0.md` — Project scaffolding and tooling setup
- `docs/STAGE_1.md` — Repo selection + status UI (M1)
- `docs/STAGE_2.md` — Diff viewer integration (M2)
- `docs/STAGE_3.md` — Context menu + polish (M3)
- `docs/STAGE_4.md` — Packaging and distribution
