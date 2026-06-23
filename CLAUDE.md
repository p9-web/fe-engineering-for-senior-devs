# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A learning platform for senior frontend engineers (see `README.md`). The substance of the project is the **VitePress documentation site under `docs/`** — that is where course content lives and grows. The seed curriculum is `docs/course-syllabus.md` (9 modules: JS runtime internals, browser rendering, reactivity systems, DS&A in frameworks, compilers/ASTs, build-from-scratch, source-reading, networking, WebAssembly).

AI assistants are expected to (per `README.md`): augment the content with high-value material aligned to the stated objectives, organize/normalize docs as they accumulate, act as pedagogical guides, and eventually implement per-user progress tracking.

## Two stacks in one repo — don't confuse them

This repo contains two independent Vite-based stacks that share `package.json`:

1. **`docs/` — the real project.** A VitePress site. Content is Markdown; nav/sidebar are configured in `docs/.vitepress/config.mts`. New course material goes here as `.md` pages wired into the sidebar.
2. **Root `src/` + `index.html` — leftover Vite vanilla-TS starter** (the counter demo from the scaffold). It is not the learning platform. Treat it as scaffolding unless asked to build the interactive app layer here; new course content does **not** go in `src/`.

## Commands

```bash
# Docs site (the project) — dev server runs on port 5179 (set in config.mts, not the Vite default)
npm run docs:dev
npm run docs:build      # outputs to docs/.vitepress/dist
npm run docs:preview

# Root starter app
npm run dev             # vite dev server
npm run build           # tsc (typecheck) && vite build
npm run preview
```

There is **no test runner and no linter** configured. Type-checking is the only static gate, and only `npm run build` runs it (`tsc`) — and only over `src/` per `tsconfig.json` (`"include": ["src"]`). VitePress `.md`/Vue content is not type-checked by that step. Don't claim tests pass; there are none.

## Authoring course content (the primary work)

Writing and curating course material is the main job here, not an afterthought. When adding or editing docs under `docs/`, follow these rules (derived from `README.md`):

- **Depth over breadth; execution over APIs.** Explain how things actually run — the mechanism, the memory, the cost — not how to call the API. The audience is senior devs; skip the basics and go a layer below where their mental model usually stops. Match the rigor of `docs/course-syllabus.md` (e.g. microtask ordering, layout thrashing, `track`/`trigger`).
- **Teach, don't just document.** Lead with the question or the misconception, then reveal the mechanism. Use concrete, runnable examples and self-tests (the syllabus's `> **Self-Test:**` blocks are the model to follow). Anticipate where the reader's intuition breaks.
- **Stay consistent as the docs grow.** Reuse the terminology, module numbering, and structure already established in `docs/course-syllabus.md`. When a new page belongs to a module, mirror that module's framing rather than inventing a parallel vocabulary.
- **Stay aligned with the curriculum's objectives.** New content must serve the "silicon to the screen" goal. If a topic doesn't deepen execution-level understanding, it probably doesn't belong.
- Claims about runtime/engine behavior should be correct and verifiable — prefer referencing real source (Vue, Vite, V8, TypeScript) over hand-waving.

## Conventions worth knowing

- **Adding a doc page:** create `docs/<name>.md`, then register it in both `nav` and `sidebar` in `docs/.vitepress/config.mts` or it won't be reachable.
- `tsconfig.json` is strict: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `allowImportingTsExtensions` (so `.ts` extensions in imports are intentional — see `src/main.ts` importing `./counter.ts`).
- Not a git repository.
