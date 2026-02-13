# Phase 2: Settings & API Key Storage

## Context

The narrative review feature requires an Anthropic API key to call Claude. This phase adds a Settings dialog accessible from the TopBar (gear icon) and app menu (Cmd+,) where the user can securely store their API key. The key is encrypted using Electron's `safeStorage` and persisted across app restarts.

## Prerequisites

- Phase 1 (Mode Switching) — not strictly required, but the Settings feature is shared infrastructure

## New IPC channels

In `src/shared/ipc.ts`, add to `IPC_CHANNELS`:
```typescript
SETTINGS_GET_API_KEY: 'settings.getApiKey',
SETTINGS_SET_API_KEY: 'settings.setApiKey',
SETTINGS_HAS_API_KEY: 'settings.hasApiKey',
SETTINGS_CLEAR_API_KEY: 'settings.clearApiKey',
SHORTCUT_OPEN_SETTINGS: 'shortcut.openSettings',
```

Extend `DiffyApi`:
```typescript
getApiKey: () => Promise<Result<string>>
setApiKey: (key: string) => Promise<Result<void>>
hasApiKey: () => Promise<Result<boolean>>
clearApiKey: () => Promise<Result<void>>
onShortcutOpenSettings: (callback: () => void) => () => void
```

## New files

### `src/main/secure-storage.ts`
Wraps Electron's `safeStorage` API for API key persistence.

- Storage file: `app.getPath('userData')/secure-keys.json` (encrypted key as base64)
- Check `safeStorage.isEncryptionAvailable()` before use; return error if unavailable
- Exports:
  - `saveApiKey(key: string): void` — encrypts and persists
  - `loadApiKey(): string | null` — decrypts and returns, or null if not stored
  - `hasApiKey(): boolean` — checks if a key exists without decrypting
  - `clearApiKey(): void` — removes the stored key

### `src/renderer/components/SettingsDialog.tsx` + `SettingsDialog.module.css`
Modal dialog following the existing `ConfirmModal` pattern (backdrop + centered dialog via Portal).

Content:
- "Anthropic API Key" label
- Password input field (type="password")
- Status text showing whether a key is currently stored
- "Save" button (primary) and "Cancel" button
- "Clear Key" button (danger variant, shown only when key exists)
- Basic validation: key must start with `sk-ant-`; show inline error otherwise
- On save: call `window.api.setApiKey(key)`, close dialog, show success toast
- On clear: call `window.api.clearApiKey()`, show confirmation toast

Focus management: auto-focus the input on open, Escape to close.

## Modified files

### `src/shared/ipc.ts`
Add new channel constants and extend `DiffyApi` type.

### `src/preload/index.ts`
Add the 4 new API methods (`getApiKey`, `setApiKey`, `hasApiKey`, `clearApiKey`) and `onShortcutOpenSettings` event listener.

### `src/main/ipc-handlers.ts`
Register handlers for the 4 settings channels. Each handler calls the corresponding `secure-storage.ts` function and returns `Result<T>`.

### `src/main/app-menu.ts`
Add "Settings..." menu item with `CmdOrCtrl+,` accelerator. Sends `SHORTCUT_OPEN_SETTINGS` to the renderer window.

### `src/renderer/store/ui-slice.ts`
Add to state:
```typescript
settingsOpen: boolean  // initially false
```
Add reducers: `openSettings`, `closeSettings`
Add selector: `selectSettingsOpen`

### `src/renderer/components/TopBar.tsx`
Add a gear icon button (can use a simple unicode character or SVG) in the actions area that dispatches `openSettings()`.

### `src/renderer/components/TopBar.module.css`
Style for the settings button (same pattern as existing `.button`).

### `src/renderer/App.tsx`
Render `<SettingsDialog />` alongside other global overlays (ToastContainer, ConfirmModal).

### `src/renderer/hooks/use-keyboard-shortcuts.ts`
Add `window.api.onShortcutOpenSettings()` listener that dispatches `openSettings()`.

## Verification

- [ ] Gear icon visible in TopBar, opens Settings dialog on click
- [ ] Cmd+, opens Settings dialog
- [ ] Can enter an API key and save it
- [ ] Re-opening Settings shows that a key is stored (masked)
- [ ] "Clear Key" removes the stored key
- [ ] API key persists across app restarts
- [ ] Invalid key format shows validation error
- [ ] Escape closes the dialog
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
