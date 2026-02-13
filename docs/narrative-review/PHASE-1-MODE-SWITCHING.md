# Phase 1: Mode Switching & App Shell

## Context

Diffy currently has a single mode — reviewing staged/unstaged working-tree diffs. This phase adds the concept of application modes to Redux and the UI, allowing the user to toggle between "Diff Review" (existing) and "Narrative Review" (new). The narrative mode starts as a placeholder screen that later phases will populate.

## Requirements

- TopBar gains a segmented toggle to switch between modes
- Switching to Narrative Review hides the SidePane and diff viewer, showing a placeholder
- Switching back to Diff Review restores the existing UI fully
- All existing functionality remains unchanged in Diff Review mode

## New types

In `src/shared/types.ts`:
```typescript
export type AppMode = 'diff-review' | 'narrative-review'
```

## New files

### `src/renderer/store/mode-slice.ts`
Redux slice for application mode state.

State:
```typescript
type ModeState = {
  activeMode: AppMode
}
```

- Initial state: `{ activeMode: 'diff-review' }`
- Reducer: `setMode(state, action: PayloadAction<AppMode>)`
- Selector: `selectActiveMode`

### `src/renderer/components/NarrativeShell.tsx` + `NarrativeShell.module.css`
Placeholder component for narrative mode. Centered text: "Paste a GitHub PR link to get started" with a hint below. Styled consistently with the existing `Placeholder` component pattern but as a full-area container that later phases will replace with the real UI.

## Modified files

### `src/shared/types.ts`
Add `AppMode` type export.

### `src/renderer/store/index.ts`
Register `modeReducer` in the store config:
```typescript
reducer: {
  repo: repoReducer,
  changes: changesReducer,
  diff: diffReducer,
  ui: uiReducer,
  mode: modeReducer,  // new
}
```

### `src/renderer/components/TopBar.tsx`
Add a mode toggle between `repoName` and `actions`. Two buttons styled as a segmented control:
- "Diff Review" — dispatches `setMode('diff-review')`
- "Narrative Review" — dispatches `setMode('narrative-review')`
- Active button gets `--accent` color styling
- Both buttons need `-webkit-app-region: no-drag` (title bar is draggable)

### `src/renderer/components/TopBar.module.css`
Add styles:
- `.modeToggle` — flex container with small gap
- `.modeButton` — similar to existing `.button` but part of a toggle group
- `.modeButtonActive` — accent background/border to indicate active mode

### `src/renderer/App.tsx`
Read `selectActiveMode` from Redux. In the `App` component:
- When `'diff-review'`: render existing `<MainContent />` + `<SidePane />` (no changes)
- When `'narrative-review'`: render `<NarrativeShell />` instead (no SidePane)

The TopBar, ToastContainer, and ConfirmModal always render regardless of mode.

## Verification

- [ ] App starts in Diff Review mode — all existing behavior unchanged
- [ ] Mode toggle buttons visible in TopBar
- [ ] Clicking "Narrative Review" shows the placeholder shell, hides SidePane
- [ ] Clicking "Diff Review" restores the normal diff view
- [ ] Mode state persists during the session (switching back and forth preserves file selection in diff mode)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
