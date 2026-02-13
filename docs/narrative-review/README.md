# Narrative PR Review — Feature Overview

A second application mode that takes a GitHub PR and presents a structured, chapter-by-chapter walkthrough — like having the author talk you through the changes. The goal is to provide context and grounding for reviewers, not just raw diffs.

## How it works

1. User toggles to "Narrative Review" mode via the TopBar
2. Pastes a GitHub PR URL
3. App fetches PR data via `gh` CLI (metadata, diff, file list, comments)
4. Sends PR data to Anthropic Claude API
5. Receives a structured narrative: 5-12 chapters, each with a title, explanatory text, and relevant diff snippets
6. User reads through chapters sequentially or navigates via sidebar

## Key decisions

- **LLM Provider**: Anthropic (Claude API)
- **Entry Point**: Mode toggle in the TopBar
- **API Key Storage**: Settings dialog, encrypted via Electron `safeStorage`
- **No new npm dependencies**: Uses `fetch` for API, `spawn` for CLI, built-in `safeStorage`

## Implementation phases

Each phase is independently implementable and testable. Phases 2 and 3 can be built in parallel after Phase 1.

```
Phase 1 (Mode Switching)
  ├→ Phase 2 (Settings)  ──┐
  └→ Phase 3 (GitHub CLI) ──┼→ Phase 4 (LLM) → Phase 5 (UI) → Phase 6 (Polish)
                             │
                    (both required)
```

| Phase | Doc | Summary |
|-------|-----|---------|
| 1 | [PHASE-1-MODE-SWITCHING.md](./PHASE-1-MODE-SWITCHING.md) | App mode concept, TopBar toggle, empty narrative shell |
| 2 | [PHASE-2-SETTINGS.md](./PHASE-2-SETTINGS.md) | Settings dialog, API key storage with safeStorage |
| 3 | [PHASE-3-GITHUB-CLI.md](./PHASE-3-GITHUB-CLI.md) | `gh` CLI integration, PR URL parsing, data fetching |
| 4 | [PHASE-4-LLM-GENERATION.md](./PHASE-4-LLM-GENERATION.md) | Anthropic API client, prompt engineering, streaming |
| 5 | [PHASE-5-NARRATIVE-UI.md](./PHASE-5-NARRATIVE-UI.md) | Chapter cards, inline diffs, sidebar nav, keyboard shortcuts |
| 6 | [PHASE-6-POLISH.md](./PHASE-6-POLISH.md) | Loading states, cancellation, accessibility, edge cases |
