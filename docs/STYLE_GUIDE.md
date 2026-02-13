# Diffy — Style Guide

## TypeScript

### General

- **Strict mode**: `strict: true` in tsconfig. No `any` — use `unknown` and narrow.
- **Prefer `type` over `interface`** for data shapes and unions. Use `interface` only when declaration merging is needed (rare).
- **Prefer `const` over `let`**. Never use `var`.
- **Explicit return types** on exported functions and all async functions.
- **No default exports**. Use named exports everywhere for consistency and refactoring safety.
- **Enums**: Avoid. Use `as const` objects or union literal types instead.

### Naming

| Thing | Convention | Example |
|---|---|---|
| Files (utilities, modules) | `kebab-case.ts` | `git-runner.ts`, `file-watcher.ts` |
| Files (React components) | `PascalCase.tsx` | `FileList.tsx`, `DiffView.tsx` |
| Files (CSS Modules) | `PascalCase.module.css` | `FileList.module.css` |
| Files (test) | `*.test.ts` / `*.test.tsx` | `git-runner.test.ts` |
| Types / Interfaces | `PascalCase` | `FileChange`, `DiffContent` |
| Functions / Variables | `camelCase` | `parseStatus`, `repoRoot` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_DEBOUNCE_MS`, `IPC_CHANNELS` |
| React Components | `PascalCase` | `FileRow`, `ContextMenu` |
| Redux Slices | `camelCase` + `Slice` suffix | `repoSlice`, `changesSlice` |
| Redux Thunks | `camelCase` (verb-first) | `refreshStatus`, `loadDiff` |
| CSS Module classes | `camelCase` | `.fileRow`, `.statusBadge` |
| IPC channels | `dot.separated` | `git.stageFile`, `repo.open` |

### Imports

Order imports with blank line separators between groups:

```ts
// 1. Node built-ins
import { resolve } from 'node:path'

// 2. External packages
import { createSlice } from '@reduxjs/toolkit'
import React from 'react'

// 3. Internal (absolute paths from src/)
import { FileChange } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipc'

// 4. Relative imports
import { parseStatus } from './parse-status'
import styles from './FileList.module.css'
```

Use path aliases configured in tsconfig:
- `@main/*` → `src/main/*`
- `@preload/*` → `src/preload/*`
- `@renderer/*` → `src/renderer/*`
- `@shared/*` → `src/shared/*`

## React

### Components

- **Functional components only**. No class components.
- **One component per file**. Exception: small, tightly-coupled helper components can share a file.
- **Props type**: Define inline or as a named `type` above the component. Name it `ComponentNameProps`.

```tsx
type FileRowProps = {
  file: FileChange
  isSelected: boolean
  onSelect: (path: string, section: Section) => void
}

export function FileRow({ file, isSelected, onSelect }: FileRowProps): React.ReactElement {
  // ...
}
```

- **No `React.FC`** — just use regular function declarations with explicit return types.
- **Hooks**: Custom hooks go in `src/renderer/hooks/` and are prefixed with `use`.
- **Event handlers**: Prefix with `handle` in the component, `on` in props.

```tsx
// In parent (prop name)
<FileRow onSelect={handleFileSelect} />

// In child (handler implementation)
function handleClick() { onSelect(file.path, file.section) }
```

### State Management

- **Local state** for UI-only concerns (hover, focus, menu open/close).
- **Redux** for domain state (repo, changes, diff) and anything that crosses component boundaries.
- **Async thunks** for all IPC calls. Thunks handle loading/error states.
- **Selectors**: Define reusable selectors in slice files. Use `createSelector` from RTK for derived data.

## CSS Modules

### File Organization

- CSS Module files are co-located with their component:
  ```
  components/
    FileList.tsx
    FileList.module.css
    FileRow.tsx
    FileRow.module.css
  ```

### Class Naming

- Use `camelCase` for class names in CSS Modules.
- Keep names semantic and component-scoped.

```css
/* FileRow.module.css */
.row { }
.row.selected { }
.statusBadge { }
.fileName { }
.hoverAction { }
```

```tsx
import styles from './FileRow.module.css'

<div className={`${styles.row} ${isSelected ? styles.selected : ''}`}>
```

### Theme Variables

Define all colors, spacing, and typography as CSS custom properties in a global theme file:

```css
/* src/renderer/styles/theme.css */
:root {
  --bg-primary: #1e1e2e;
  --bg-secondary: #252536;
  --bg-hover: #2a2a3d;
  --text-primary: #cdd6f4;
  --text-secondary: #a6adc8;
  --accent: #89b4fa;
  --danger: #f38ba8;
  --success: #a6e3a1;
  --border: #313244;
  /* ... etc */
}
```

Components reference these variables — never hardcode colors.

### Status Badge Colors

File status badges use theme variables for consistent color coding:

| Status | Badge | Variable | Color |
|---|---|---|---|
| A (added) | Green | `--success` | `#a6e3a1` |
| M (modified) | Yellow | `--warning` | `#f9e2af` |
| D (deleted) | Red | `--danger` | `#f38ba8` |
| R (renamed) | Blue | `--accent` | `#89b4fa` |
| ? (untracked) | Gray | `--text-muted` | `#6c7086` |

### Design Reference

The color palette draws from Catppuccin Mocha tones — dark blue-gray backgrounds with cool-toned text and vibrant accent colors. The overall aesthetic targets a GitKraken-like dark, compact, crisp appearance.

## Error Handling

### Main Process (git commands)

- Wrap all `spawn` calls in a utility that captures stderr and exit codes.
- Return typed result objects: `{ ok: true, data: T } | { ok: false, error: string }`.
- Never throw across the IPC boundary — always return error state.

### Renderer

- Thunks use `rejectWithValue` to surface errors to Redux state.
- UI displays errors via toast notifications (non-blocking) or inline messages.
- Never silently swallow errors.

### IPC

- All IPC handlers are wrapped in try/catch at the top level.
- Errors are serialized as plain objects (Error instances don't cross IPC cleanly).

## Git Command Patterns

- Always use `-C <repo>` to target the correct repository.
- Always use `--` to separate paths from options.
- Always validate paths against repo root before execution.
- Use `spawn` with an args array — never interpolate paths into a command string.

```ts
// Good
spawn('git', ['-C', repoRoot, 'add', '--', filePath])

// Bad
exec(`git -C ${repoRoot} add -- ${filePath}`)
```

## Testing

### Unit Tests (Vitest)

- Test files adjacent to source: `git-runner.test.ts` next to `git-runner.ts`.
- Test the porcelain v2 parser thoroughly — it's a critical path.
- Mock `child_process.spawn` for git runner tests.
- Test Redux slices with pure reducer tests and thunk tests.

### E2E Tests (Playwright)

- E2E tests in a top-level `e2e/` directory.
- Test against a real git repo fixture (created in test setup).
- Cover: repo open, file list rendering, stage/unstage, diff display.
