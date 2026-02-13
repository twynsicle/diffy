# Phase 5: Narrative Review UI

## Context

With narrative data generated (Phase 4), this phase builds the full reading experience: chapter cards with inline diff chunks, a sidebar for navigation, toolbar controls, and keyboard shortcuts. This is the core user-facing deliverable.

## Prerequisites

- Phase 4 (LLM Generation) — provides the `NarrativeReview` data structure

## Layout

When a review is loaded, the NarrativeShell renders:

```
┌──────────────────────────────────────────────────┐
│ NarrativeToolbar                                  │
│  PR title          ◀ 3 of 8 ▶        Regenerate  │
├──────────────────────────────────┬────────────────┤
│ NarrativeView (scrollable)       │ ChapterNav     │
│  ┌────────────────────────────┐  │ (fixed ~250px) │
│  │ Chapter 1: Title           │  │                │
│  │ Summary text (markdown)    │  │ 1. Title ●     │
│  │ ┌────────────────────────┐ │  │ 2. Title       │
│  │ │ src/main/handler.ts    │ │  │ 3. Title       │
│  │ │ + added line           │ │  │ 4. Title       │
│  │ │ - removed line         │ │  │ ...            │
│  │ │   context line         │ │  │                │
│  │ └────────────────────────┘ │  │                │
│  │ ┌────────────────────────┐ │  │                │
│  │ │ src/shared/types.ts    │ │  │                │
│  │ │ ...                    │ │  │                │
│  │ └────────────────────────┘ │  │                │
│  ├────────────────────────────┤  │                │
│  │ Chapter 2: Title           │  │                │
│  │ ...                        │  │                │
│  └────────────────────────────┘  │                │
└──────────────────────────────────┴────────────────┘
```

## New files

### `src/renderer/components/NarrativeView.tsx` + `NarrativeView.module.css`
Main scrollable chapter container.

- Renders all chapters as `ChapterCard` components vertically
- Max-width ~900px, centered, with vertical padding for comfortable reading
- Uses `IntersectionObserver` to detect which chapter is in the viewport
- Dispatches `setActiveChapter` when the visible chapter changes
- Each ChapterCard has a DOM `id` (e.g., `chapter-{id}`) for scroll-to navigation

### `src/renderer/components/ChapterCard.tsx` + `ChapterCard.module.css`
Renders a single chapter.

- Chapter number badge + title as a heading
- Summary rendered via `<MarkdownText />`
- List of `<InlineDiffChunk />` components for each diff chunk
- Visual separator between chapters (subtle border or spacing)
- Subtle background differentiation from the main scroll area

### `src/renderer/components/InlineDiffChunk.tsx` + `InlineDiffChunk.module.css`
Renders a diff chunk inline (no Monaco — avoids overhead of many editor instances).

- Filename header bar with the file path and a language badge
- `<pre>` element with line-by-line `<span>` elements
- Line coloring based on diff status:
  - Lines starting with `+` → subtle green background (`--diff-add-bg`), green text
  - Lines starting with `-` → subtle red background (`--diff-remove-bg`), red text
  - Context lines → no special background
  - `@@` hunk headers → muted color
- Uses monospace font (`--font-mono`)
- No internal scrolling — chunk is fully visible (height determined by content)
- Overflow-x: auto for long lines

### `src/renderer/components/ChapterNav.tsx` + `ChapterNav.module.css`
Right sidebar for chapter navigation.

- Fixed width ~250px
- Lists all chapters by number and title (truncated if long)
- Active chapter highlighted with `--accent` left border or background
- Click → smooth scroll to that chapter in NarrativeView
- Sticky positioning so it stays visible while the main content scrolls
- Compact styling consistent with the existing SidePane aesthetic

### `src/renderer/components/NarrativeToolbar.tsx` + `NarrativeToolbar.module.css`
Toolbar above the narrative view.

- Left: PR title (truncated)
- Center: navigation controls — back arrow button, "3 of 8" counter, forward arrow button
- Right: "Regenerate" button
- Back/forward disabled at start/end
- Styling follows the existing `DiffToolbar` pattern

### `src/renderer/components/MarkdownText.tsx` + `MarkdownText.module.css`
Simple markdown renderer — no external dependencies.

Supported syntax:
- Paragraphs (double newline separation)
- Bold (`**text**`)
- Inline code (`` `code` ``)
- Code blocks (triple backtick)
- Bullet lists (`- item`)
- Headers (`## heading`)

Returns React elements (no `dangerouslySetInnerHTML`).

Typography styles: appropriate font sizes for headers, monospace for code, proper spacing.

### `src/renderer/hooks/use-narrative-keyboard.ts`
Keyboard shortcuts, active only when in narrative-review mode with a review loaded.

| Key | Action |
|-----|--------|
| `ArrowRight` or `Space` | Scroll to next chapter |
| `ArrowLeft` or `Shift+Space` | Scroll to previous chapter |
| `Home` | Scroll to first chapter |
| `End` | Scroll to last chapter |
| `1`-`9` | Jump to chapter N |

Implementation:
- Listen on `document` keydown
- Check that mode is `narrative-review` and review exists
- Prevent default for handled keys
- Dispatch scroll-to-chapter action (smooth scroll via `element.scrollIntoView`)

## New theme variables

In `src/renderer/styles/theme.css`:
```css
--diff-add-bg: rgba(166, 227, 161, 0.1);
--diff-remove-bg: rgba(243, 139, 168, 0.1);
--diff-add-text: #a6e3a1;
--diff-remove-text: #f38ba8;
--bg-chapter: #1e1e30;
```

## Modified files

### `src/renderer/store/narrative-slice.ts`
Add to state:
```typescript
activeChapterId: string | null
```

New reducer:
- `setActiveChapter(state, action: PayloadAction<string>)`

New selectors:
- `selectActiveChapter` — returns active chapter ID
- `selectChapterList` — returns `{ id, title }[]` for navigation
- `selectActiveChapterIndex` — 0-based index

### `src/renderer/components/NarrativeShell.tsx` + `NarrativeShell.module.css`
Replace the Phase 4 simple list with the full layout:
- Pre-review: PrInput + PrSummary + Generate button (unchanged)
- Post-review: NarrativeToolbar + (NarrativeView | ChapterNav) flex layout
- Generating state: loading overlay (can be simple for now, Phase 6 polishes it)

### `src/renderer/styles/theme.css`
Add the new diff color variables.

### `src/renderer/App.tsx`
Call `useNarrativeKeyboard()` hook (conditionally, only when in narrative mode).

## Verification

- [ ] Generated review renders as styled chapter cards
- [ ] Each chapter shows title, markdown summary, and colored diff chunks
- [ ] Diff chunks display filename header and properly colored +/- lines
- [ ] Scrolling through chapters updates the active highlight in ChapterNav
- [ ] Clicking a chapter in ChapterNav smooth-scrolls to it
- [ ] Toolbar back/forward buttons navigate chapters
- [ ] Toolbar shows correct chapter counter
- [ ] Keyboard: arrows, space, number keys all navigate correctly
- [ ] "Regenerate" button creates a new review
- [ ] Long diff lines scroll horizontally within chunks
- [ ] Markdown renders correctly (bold, code, lists, headers)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
