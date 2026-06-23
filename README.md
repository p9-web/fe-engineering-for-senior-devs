# FE Engineering for Senior Devs

A learning platform that takes capable frontend developers and turns them into engineers who understand execution **from the silicon to the screen** — the runtime, the browser, the frameworks, and the build tools, not just the APIs on top of them.

The content is published as a [VitePress](https://vitepress.dev) documentation site. The full curriculum lives in **[`docs/course-syllabus.md`](./docs/course-syllabus.md)**.

## Curriculum at a glance

Nine modules, each going one layer deeper than the typical senior-dev comfort zone:

| # | Module | Core question it answers |
|---|--------|--------------------------|
| 1 | **JavaScript at the Runtime Level** | How does the event loop, memory model, and V8 (hidden classes, JIT, deopt) actually execute my code? |
| 2 | **The Browser as an Operating System** | What happens every 16.67ms — layout, paint, composite, reflow, the render pipeline? |
| 3 | **Deep Reactivity Systems** | How do Vue `track/trigger`, signals, the virtual DOM, and Svelte's compiler propagate state? |
| 4 | **Data Structures & Algorithms in Practice** | Why do frameworks reach for trees, WeakMaps, linked lists, and graphs under the hood? |
| 5 | **Code as Data (Compilers & ASTs)** | How does `<div>{{ message }}</div>` become executable JavaScript? |
| 6 | **Build Difficult Things from Scratch** | Can I implement a virtual scroller, a reactive engine, a mini-framework, a bundler? |
| 7 | **Source Code Reading & Technical Judgment** | How do I read Vue/Vite/TS source and reason about architectural tradeoffs? |
| 8 | **The Network & Execution Bridge** | How do HTTP/2-3, service workers, and real-time protocols deliver and cache execution? |
| 9 | **WebAssembly & the Future Runtime** | What does the Wasm memory model and the JS/Wasm boundary cost? |

## Repository layout

This repo holds **two independent Vite stacks**. Know which one you're touching:

- **`docs/` — the project.** The VitePress site where all course content lives. Pages are Markdown; navigation is wired in `docs/.vitepress/config.mts`. **This is where new material goes.**
- **`src/` + root `index.html` — scaffold.** The leftover Vite vanilla-TS starter (the counter demo). It is *not* the learning platform; treat it as a placeholder for any future interactive app layer. Course content does **not** belong here.

## Getting started

```bash
npm install

# Run the course site (dev server on http://localhost:5179)
npm run docs:dev

# Build / preview the static site (output: docs/.vitepress/dist)
npm run docs:build
npm run docs:preview
```

> The docs dev server uses port **5179**, set in `config.mts` to avoid Vite's default 5173.

There is no test runner or linter configured yet; `tsc` (run via `npm run build`) only type-checks the `src/` scaffold, not the Markdown content.

## Adding a course page

1. Create `docs/<topic>.md`.
2. Register it under `nav` **and** `sidebar` in [`docs/.vitepress/config.mts`](./docs/.vitepress/config.mts) — an unregistered page won't be reachable from the site.
3. Verify it renders with `npm run docs:dev`.

## Working alongside AI assistants

This project is built collaboratively with AI assistants, who are expected to:

- **Enrich the content** with high-value material, always staying aligned with the curriculum's objectives — depth over breadth, execution over surface APIs.
- **Organize and normalize** the documentation as it grows, keeping structure and terminology consistent across modules.
- **Teach, not just write** — approach every contribution as a pedagogical guide, anticipating where a senior dev's mental model breaks down.
- **Build progress tracking** so each learner's path can be measured and the experience optimized over time.
