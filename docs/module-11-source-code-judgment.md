---
title: "Module 11 · Source Reading & Technical Judgment"
description: "Reading unfamiliar source by execution, not file order: entry-point tracing, git archaeology, and writing benchmarks the JIT can't fool."
learn:
  module: 11
  level: advanced
  timeRequired: PT30M
  prerequisites:
    - "the mechanisms from modules 1–6"
    - "git basics"
  outcomes:
    - "Trace an unfamiliar codebase by execution path, not top-to-bottom"
    - "Design a benchmark that the JIT and dead-code elimination can't fool"
    - "Turn a performance hunch into a falsifiable hypothesis"
  concepts:
    - "entry-point tracing"
    - "test-driven exploration"
    - "end-to-end value tracking"
    - "git archaeology (blame, PR history)"
    - "benchmarking pitfalls (JIT, warm-up, timer resolution)"
    - "dead-code elimination in benchmarks"
    - "dependency auditing"
    - "RFCs & ADRs"
    - "falsifiable hypotheses"
  misconceptions:
    - "read source top-to-bottom (follow execution and tests instead)"
    - "a microbenchmark measures real cost (JIT, DCE, and timer jitter defeat it)"
    - "the bottleneck is where you think (profile first)"
  selfTests: 2
  primarySources:
    - "Vue, Vite, TypeScript, esbuild source"
    - "git history"
    - "DevTools profiler"
  teachingApproach: "Pick a real question, then show the fastest path through the source that answers it."
---

# Module 11: Source Code Reading & Technical Judgment

Advanced engineering is not just writing code; it is reading it, understanding the historical context of its design, and communicating those concepts. This module is about turning the mechanisms from Modules 1–6 into *judgment*.

## 1. How to Actually Read a Large Codebase
"Read the source" is useless advice without a method. Large repos (Vue, Vite, TypeScript, esbuild, React) are read by following execution, not by reading files top to bottom.

* **Start at the entry point and the public API.** Find what `index.ts` exports and what the build's `input` is. The repo's surface is small; the depth is behind it.
* **Tests are the best documentation.** A function's test file shows its contract, edge cases, and intended use — often clearer than any comment. Read `*.spec.ts` before the implementation.
* **Follow one value end-to-end** — and not always in the reactivity layer:
  * *Vue:* how does `ref(0)` reach a DOM text node? `ref` → `RefImpl.get value` → `track` → effect → scheduler → patch.
  * *Vite:* how does `import x from 'lodash'` get resolved in dev? A bare specifier like `lodash` is first **pre-bundled by esbuild** (`optimizeDeps`) into a single ESM file under `node_modules/.vite/deps`, then served from there; your own source flows through the plugin pipeline — `resolveId` (specifier → file path) → `load` → `transform` (rewrite imports) → dev server. This shows the *plugin-hook* architecture (and the esbuild pre-bundle step) that the reactivity trace never touches.
* **Set a breakpoint in `node_modules`.** Source maps (Module 7) let you step into the real library code from your own app in DevTools. Watching the actual call stack beats reading.
* **Use git as archaeology.** `git blame` and the PR that introduced a line tell you *why* it exists. A weird-looking workaround usually has a linked issue explaining the bug it fixes — design intent lives in history, not the file.

> **Self-Test:**
> You want to know why Vue batches updates. Which gets the answer fastest: (a) reading `scheduler.ts` top to bottom, (b) finding the `nextTick`/`queueJob` tests, (c) `git blame` on the queue-dedup line and reading the linked issue? In practice (b) then (c): the test shows *what* the contract guarantees; the history shows *what bug* forced it.

## 2. Judgment Is Measured, Not Asserted
Reading source tells you *how* something works; only measurement tells you whether a decision is right.

* **Don't trust, measure.** "Signals are faster than VDOM" is a claim about a workload, not a law. Profile the real one (Module 2).
* **Microbenchmark traps — know which layer bites you:**
  * The killer is usually the **optimizing JIT at runtime** (Module 1), not bundler dead-code elimination (that's build-time, Module 7). If a benchmark's result is never consumed, the optimizer may prove the computation dead and delete it, hoist it out of the loop (**loop-invariant code motion**), or inline it away — so you time something other than what you meant. Defeat it with a *sink*: accumulate results into a `blackhole` variable you print at the end.
  * **Warm up.** Cold runs measure Ignition/Sparkplug, not TurboFan. Loop enough to reach steady state, then measure.
  * **Timer resolution lies.** `performance.now()` is deliberately **clamped/jittered** (a Spectre mitigation — ~100µs in Chrome, finer only in cross-origin-isolated contexts), so sub-millisecond single-shot timings are noise. Measure many iterations and divide.

> **Self-Test:**
> This "benchmark" reports 0ms. Why, and what one line fixes it?
> ```js
> const t = performance.now()
> for (let i = 0; i < 1e7; i++) Math.sqrt(i)   // result unused
> console.log(performance.now() - t)
> ```
> *(Because nothing consumes `Math.sqrt(i)`, the optimizer may eliminate or hoist the body — so the number is meaningless: near-zero, or just timer noise, not real work. Fix: `sum += Math.sqrt(i)` and `console.log(sum)` so the computation is observable and can't be dropped.)*

* **Evaluating a dependency is judgment too — make it concrete:** does it tree-shake (ESM + `"sideEffects": false`, Module 7)? `grep` your codebase for the export surface you *actually* use — often it's two functions of a 50KB lib. Open the dep's own `node_modules` to see its transitive weight. And the real question: *if this breaks in two years, can my team own it?*

## 3. Communicating Technical Judgment
Knowledge is useless if you can't leverage it to guide a team. You want to be the engineer who can credibly say, "This architecture will fail in 18 months because state-propagation complexity is wrong" — and back it.

* **Tradeoff analysis with numbers, not adjectives:** "VDOM is slow" persuades no one. "A VDOM diff is ~O(n) per render; this grid re-renders 10,000 rows on every keystroke, which at ~5µs/node blows the 16.67ms frame budget (Module 2) — signals would touch only the changed cell" is a judgment. State the cost *and* the threshold where it bites.
* **RFCs:** Before building something complex, write a Request for Comments — Problem Statement, Proposed Solution, **Alternatives Considered (and why rejected)**, Unresolved Questions. The "alternatives" section is where judgment shows. (Read real ones: the Vue 3 and React RFC repos, and TC39 proposals, are public masterclasses.)
* **ADRs:** Architecture Decision Records capture a decision and its context at a point in time, so future readers (including you) understand *why*, not just *what* — the same value `git blame` provides for code.
* **System diagrams:** Be able to draw the full execution path — network request → service worker → runtime → reactivity → compositor (Modules 1, 2, 3, 8) — on a whiteboard. If you can't diagram it, you don't understand it yet.

## 4. The Core Skill: Being Wrong Well
The highest form of technical judgment is reading source (and running benchmarks) to **disprove your own assumption**, not confirm it.

* Form a falsifiable hypothesis — "I believe `v-memo` won't help here because the bottleneck is layout, not diffing."
* Go find the evidence that would prove you *wrong*: profile it, read the implementation, build the smallest repro.
* Change your mind in public when the evidence says so. An engineer who updates loudly on data earns far more trust than one who is never seen to be wrong — and avoids the failure spiral of defending a stance the code already contradicts.
