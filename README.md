# stopit / slopit

A webapp for creating **"STOP DOING X"** memes — the viral format that satirically dismisses any topic using absurd common-sense logic.

**[Live demo](https://stopit.imsandra.fyi)**

## Features

- **WYSIWYG markdown editor** — edit meme content with rich text, headings, bold, lists, and image references
- **Live preview** — see the meme render in real-time as you edit, auto-scaled to fit
- **AI generation** — enter a topic, get a complete meme with text and image prompts via OpenRouter (BYOK)
- **Separate text & image generation** — review and refine text before spending on image generation
- **Per-image regenerate modal** — compare current vs new, keep a history of attempts, edit prompts
- **Persistent history** — all memes saved to IndexedDB, survives page reloads
- **Image deduplication** — images stored by SHA-256 hash, text-only edits don't duplicate blobs
- **Meme gallery** — browse history grouped by heading, star favorites, restore any snapshot
- **Image gallery** — browse all generated/uploaded images, download, or reuse in current meme
- **PNG export** — export the meme as a high-res PNG
- **JSON import/export** — save and share meme manifests as JSON files
- **Dark mode** — full dark mode support via `prefers-color-scheme`
- **Resizable split pane** — drag to resize editor vs preview

## Tech stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- MDXEditor (WYSIWYG markdown)
- marked (markdown → inline-styled HTML for export)
- html-to-image (PNG export)
- lucide-react (icons)
- IndexedDB (persistence)
- OpenRouter API (AI text + image generation)

## Getting started

```bash
npm install
npm run dev
```

For AI features, click the gear icon and enter your [OpenRouter API key](https://openrouter.ai/keys).

## How it works

The **meme manifest** (JSON) is the central artifact:

```
Markdown content → Live preview (inline-styled HTML) → PNG export
     ↑
  AI generates          Images stored by hash in IndexedDB
  & refines             Snapshots track manifest + image refs
```

The editor writes markdown with custom syntax (`![label](image:0)` for image references). The renderer converts this to inline-styled HTML (no CSS classes) so `html-to-image` can capture it pixel-perfectly.

## Meme format

The "STOP DOING X" meme follows a specific structure:

1. **Title** — "STOP DOING [TOPIC]" in bold caps
2. **Bullet points** (4) — each using a different rhetorical pattern
3. **Transition text** — "LOOK at what [practitioners] have been demanding..."
4. **Parenthetical** — "(This is REAL [X], done by REAL [practitioners]):"
5. **Three images** with labels (usually escalating "?????")
6. **Quote line** — "Hello I would like [jargon] apples please"
7. **Closing line** — "They have played us for absolute fools" (auto-bolded)

## License

MIT
