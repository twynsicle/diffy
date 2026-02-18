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
| Files (React components) | `PascalCase.tsx` | `FileTree.tsx`, `DiffView.tsx` |
| Files (CSS Modules) | `PascalCase.module.css` | `FileTree.module.css` |
| Files (test) | `*.test.ts` / `*.test.tsx` | `git-runner.test.ts` |
| Types / Interfaces | `PascalCase` | `FileChange`, `DiffContent`, `NarrativeReview` |
| Functions / Variables | `camelCase` | `parseStatus`, `repoRoot` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_DEBOUNCE_MS`, `IPC_CHANNELS` |
| React Components | `PascalCase` | `TreeRow`, `ChapterCard` |
| Redux Slices | `camelCase` + `Slice` suffix | `repoSlice`, `narrativeSlice` |
| Redux Thunks | `camelCase` (verb-first) | `refreshStatus`, `fetchPr`, `startNarrativeGeneration` |
| CSS Module classes | `camelCase` | `.fileRow`, `.statusBadge` |
| IPC channels | `dot.separated` | `git.stageFile`, `llm.generateNarrative` |

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
import styles from './FileTree.module.css'
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
type TreeRowProps = {
  file: FileChange
  isSelected: boolean
  onSelect: (path: string, section: Section) => void
}

export function TreeRow({ file, isSelected, onSelect }: TreeRowProps): React.ReactElement {
  // ...
}
```

- **No `React.FC`** — just use regular function declarations with explicit return types.
- **Hooks**: Custom hooks go in `src/renderer/hooks/` and are prefixed with `use`.
- **Event handlers**: Prefix with `handle` in the component, `on` in props.

```tsx
// In parent (prop name)
<TreeRow onSelect={handleFileSelect} />

// In child (handler implementation)
function handleClick() { onSelect(file.path, file.section) }
```

### State Management

- **Local state** for UI-only concerns (hover, focus, menu open/close).
- **Redux** for domain state (repo, changes, diff, narrative) and anything that crosses component boundaries.
- **Async thunks** for all IPC calls. Thunks handle loading/error states.
- **Selectors**: Define reusable selectors in slice files. Use `createSelector` from RTK for derived data.

## CSS Modules

### File Organization

CSS Module files are co-located with their component:
```
components/
  FileTree.tsx
  FileTree.module.css
  TreeRow.tsx
  TreeRow.module.css
  ChapterCard.tsx
  ChapterCard.module.css
```

Utility files go in `utils/`:
```
utils/
  file-tree.ts
  truncate-path.ts
  parse-diff-chunk.ts
```

### Class Naming

- Use `camelCase` for class names in CSS Modules.
- Keep names semantic and component-scoped.

```css
/* TreeRow.module.css */
.row { }
.row.selected { }
.statusBadge { }
.fileName { }
.hoverAction { }
```

```tsx
import styles from './TreeRow.module.css'

<div className={`${styles.row} ${isSelected ? styles.selected : ''}`}>
```

### Theme Variables

All colors, spacing, and typography are defined as CSS custom properties in `src/renderer/styles/theme.css`:

```css
:root {
  /* Backgrounds */
  --bg-primary: #1e1e2e;
  --bg-secondary: #252536;
  --bg-tertiary: #2a2a3d;
  --bg-hover: #313244;
  --bg-chapter: #1e1e30;

  /* Text */
  --text-primary: #cdd6f4;
  --text-secondary: #a6adc8;
  --text-muted: #6c7086;

  /* Accents */
  --accent: #89b4fa;
  --accent-hover: #74a8f7;
  --accent-selected: #3b6fca;
  --danger: #f38ba8;
  --success: #a6e3a1;
  --warning: #f9e2af;

  /* Borders */
  --border: #313244;
  --border-subtle: #45475a;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, ...;
  --font-size-xs: 0.6875rem;
  --font-size-sm: 0.8125rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Layout */
  --titlebar-height: 42px;

  /* Diff colors */
  --diff-add-bg: rgba(166, 227, 161, 0.1);
  --diff-remove-bg: rgba(243, 139, 168, 0.1);
  --diff-add-text: #a6e3a1;
  --diff-remove-text: #f38ba8;
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
- `errorToastMiddleware` auto-dispatches toast notifications for all rejected thunks.
- Never silently swallow errors.

### IPC

- All IPC handlers are wrapped in try/catch at the top level.
- Errors are serialized as plain objects (Error instances don't cross IPC cleanly).

### Streaming IPC Pattern

For IPC channels that stream data (e.g., LLM generation), use the listener + cleanup pattern:

```ts
// In a custom hook
useEffect(() => {
  const unsubChunk = window.api.onNarrativeStreamChunk((chunk) => {
    dispatch(appendStreamText(chunk))
  })
  const unsubComplete = window.api.onNarrativeStreamComplete((review) => {
    dispatch(setReview(review))
  })
  const unsubError = window.api.onNarrativeStreamError((error) => {
    dispatch(setGenerateError(error))
  })

  return () => {
    unsubChunk()
    unsubComplete()
    unsubError()
  }
}, [dispatch])
```

Each `on*` method in the preload API returns an unsubscribe function. Always call all unsubscribe functions in the effect cleanup.

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

## Drag-to-Resize Pattern

For resizable UI panels, use the established hook patterns:

- **Vertical split** (top/bottom ratio): `use-split-pane` — takes `defaultRatio`, `minRatio`, `maxRatio`
- **Horizontal panel** (pixel width): `use-resizable-panel` — takes `defaultWidth`, `minWidth`, `maxWidth`, `edge`, optional `storageKey` for localStorage persistence

Both hooks handle mousedown/mousemove/mouseup events and set cursor/userSelect during drag.

## Testing

### Unit Tests (Vitest)

- Test files adjacent to source: `git-runner.test.ts` next to `git-runner.ts`.
- Test the porcelain v2 parser thoroughly — it's a critical path.
- Mock `child_process.spawn` for git runner tests.
- Test Redux slices with pure reducer tests and thunk tests.
- Test shared utilities: `parse-pr-url.test.ts`, `file-tree.test.ts`.

### E2E Tests (Playwright)

- E2E tests in a top-level `e2e/` directory.
- Test against a real git repo fixture (created in test setup).
- Cover: repo open, file list rendering, stage/unstage, diff display.
