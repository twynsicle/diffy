# Stage 4: Packaging & Distribution

## Goal

Produce a distributable macOS application (.app bundle, DMG installer) using electron-builder. Configure app metadata, icons, and basic production hardening.

## Status: Not Started

## Prerequisites

- Stage 3 complete (polished, functional application)

## Deliverables

### 4.1 — App Icon

- [ ] Create or source an app icon for Diffy
  - macOS requires `.icns` format (multiple resolutions: 16x16 through 1024x1024)
  - Design should reflect the "diff" concept — clean, minimal, recognizable at small sizes
- [ ] Configure icon in electron-builder config
- [ ] Verify icon shows in Dock and application switcher

### 4.2 — electron-builder Configuration

- [ ] Full macOS configuration:
  - Target: DMG + zip
  - App bundle identifier (e.g., `com.diffy.app`)
  - App category: `public.app-category.developer-tools`
  - File associations: none (Diffy opens via folder picker, not file open)
  - Minimum macOS version target
- [ ] DMG configuration:
  - Custom background image (optional, nice-to-have)
  - Icon positions (app → Applications folder layout)
  - Window size
- [ ] Universal binary (arm64 + x64) or separate architecture builds

### 4.3 — Production Hardening

- [ ] Remove or disable Redux DevTools in production builds
- [ ] Disable Electron DevTools in production (`webPreferences.devTools: false` in prod)
- [ ] Set `Content-Security-Policy` headers appropriately
- [ ] Verify no source maps are included in the distributed app
- [ ] Verify no development dependencies are bundled

### 4.4 — Build & Verify

- [ ] `npm run package` produces a working `.app` bundle
- [ ] `npm run package` produces a `.dmg` installer
- [ ] DMG mounts and installs correctly
- [ ] App launches from `/Applications` after install
- [ ] App opens a repo and all features work in the packaged build
- [ ] Verify app size is reasonable (not bloated with unnecessary assets)

### 4.5 — Code Signing (Optional / Future)

- [ ] Document the process for code signing with an Apple Developer certificate
- [ ] Document notarization steps
- [ ] Note: unsigned apps will show Gatekeeper warnings — acceptable for personal/team use

### 4.6 — Auto-Update (Optional / Future)

- [ ] Document options: `electron-updater`, Sparkle, manual
- [ ] Not implementing for MVP — document as a future enhancement

## Acceptance Criteria

- `npm run package` produces a macOS .app and .dmg
- DMG installs correctly (drag to Applications)
- App launches from Applications folder
- All features work identically to dev mode
- App icon is visible in Dock
- No DevTools available in production
- No console warnings about CSP violations

## Notes

- Code signing requires an Apple Developer account ($99/year). For personal or small-team use, unsigned distribution is fine — users just need to right-click → Open the first time.
- Universal binary (arm64 + x64) increases build time significantly. For personal use, building for the current architecture only is faster.
- electron-builder can also produce `.pkg` installers — DMG is more standard for macOS dev tools.
- This stage is intentionally lightweight. Most of the work is configuration, not code.
