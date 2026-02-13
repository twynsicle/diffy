# Stage 0: Project Scaffolding & Tooling

## Goal

Set up a fully configured Electron + React + TypeScript project with all build tooling, linting, testing infrastructure, and an empty shell app that opens a window. No feature code — just a solid foundation.

## Status: Not Started

## Prerequisites

- Node.js 20+ installed
- npm
- git

## Deliverables

### 0.1 — Initialize Repository

- [ ] `git init`
- [ ] `.gitignore` (node_modules, dist, out, .vite, .env, *.dmg)
- [ ] `package.json` with project metadata
- [ ] License file (if applicable)

### 0.2 — electron-vite Setup

- [ ] Install `electron-vite` and configure `electron.vite.config.ts`
- [ ] Configure three entry points: main, preload, renderer
- [ ] Verify `npm run dev` opens an Electron window with HMR
- [ ] Verify `npm run build` produces a working production build
- [ ] Configure path aliases (`@main`, `@preload`, `@renderer`, `@shared`)

### 0.3 — TypeScript Configuration

- [ ] `tsconfig.json` (base) with `strict: true`
- [ ] `tsconfig.node.json` for main + preload (Node target)
- [ ] `tsconfig.web.json` for renderer (DOM target)
- [ ] Path aliases matching Vite config
- [ ] Verify `npm run typecheck` works

### 0.4 — ESLint & Prettier

- [ ] ESLint with TypeScript + React rules
- [ ] Prettier config (single quotes, no semicolons, trailing commas)
- [ ] `npm run lint` script
- [ ] Editor config (`.editorconfig`)

### 0.5 — Project Directory Structure

Create the empty directory skeleton:

```
src/
  main/
    main.ts              # App lifecycle, window creation
    ipc-handlers.ts      # (empty, registers handlers)
  preload/
    index.ts             # contextBridge setup (minimal)
  renderer/
    index.html           # HTML entry point
    main.tsx             # React root mount
    App.tsx              # Shell component (placeholder)
    components/          # (empty)
    store/               # (empty)
    hooks/               # (empty)
    styles/
      global.css         # Reset + CSS variables (theme)
      theme.css          # CSS custom properties for colors
  shared/
    ipc.ts               # IPC channel constants (empty initial set)
    types.ts             # Shared types (empty initial set)
```

### 0.6 — Electron Shell App

- [ ] Main process creates a `BrowserWindow` with:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `preload` script path configured
  - Reasonable default size (1200x800)
  - Dark title bar on macOS (`titleBarStyle: 'hiddenInset'` or similar)
- [ ] Preload exposes an empty `api` object via `contextBridge`
- [ ] Renderer renders a React app with a placeholder "Diffy" message
- [ ] Dark background color set (no flash of white on load)

### 0.7 — Redux Toolkit Setup

- [ ] Install `@reduxjs/toolkit` and `react-redux`
- [ ] Create store with empty slices (repo, changes, diff) — just initial state
- [ ] `<Provider>` wrapping the app
- [ ] Verify Redux DevTools work in dev mode

### 0.8 — Testing Infrastructure

- [ ] Install and configure Vitest
  - Config in `vitest.config.ts`
  - Path aliases matching Vite
  - `npm run test` script
  - One smoke test to verify the setup works
- [ ] Install and configure Playwright for Electron
  - Config in `playwright.config.ts`
  - `npm run test:e2e` script
  - One smoke test: app opens and renders
- [ ] Create `e2e/` directory

### 0.9 — electron-builder Configuration

- [ ] Basic `electron-builder` config in `package.json` or `electron-builder.yml`
- [ ] macOS target (DMG)
- [ ] `npm run package` script
- [ ] Verify packaging produces a runnable app (doesn't need to be polished)

## Acceptance Criteria

- `npm run dev` opens an Electron window with a dark background and "Diffy" text
- `npm run build` succeeds
- `npm run typecheck` passes with zero errors
- `npm run lint` passes
- `npm run test` runs and passes (smoke test)
- `npm run test:e2e` runs and passes (app opens)
- `npm run package` produces a macOS .app
- Redux DevTools show the empty store in dev mode
- No `any` types in any file

## Notes

- This stage intentionally has no feature code. The goal is a clean, working foundation that subsequent stages build on without fighting tooling issues.
- Spending time here to get the build pipeline right will save significant time later.
- The dark theme CSS variables should be established here even though the full UI comes later — this prevents the white-flash problem and establishes the color palette early.
