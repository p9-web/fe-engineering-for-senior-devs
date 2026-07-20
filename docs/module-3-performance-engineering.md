---
title: "Module 3 · Performance Engineering"
description: "Not how rendering works — how to measure and fix it: reading a flame chart, catching forced reflow in a trace, finding leaks with heap snapshots, and protecting INP."
learn:
  module: 3
  level: advanced
  timeRequired: PT45M
  prerequisites:
    - "the pixel pipeline & layout/paint/composite (module 2)"
    - "the event loop & garbage collection (module 1)"
    - "Chrome DevTools basics"
  outcomes:
    - "Read a Performance flame chart: separate scripting, rendering, and paint, and find the long task"
    - "Diagnose a forced synchronous layout from the trace and fix it by batching reads and writes"
    - "Find a memory leak with heap-snapshot diffing and the retainer path"
  concepts:
    - "the measure → locate → hypothesize → fix → re-measure loop"
    - "reading a flame chart (scripting vs rendering vs paint)"
    - "main-thread long tasks (>50ms)"
    - "forced synchronous layout in a trace"
    - "heap snapshots & the three-snapshot technique"
    - "retainer paths & detached DOM nodes"
    - "Interaction to Next Paint (INP)"
    - "breaking up long tasks (scheduler.postTask, yielding)"
    - "deciding from the trace when to go off-main-thread"
  misconceptions:
    - "optimize first, measure later (you optimize the wrong thing)"
    - "the bottleneck is where you think it is"
    - "a smooth 60fps animation just needs requestAnimationFrame"
  selfTests: 4
  primarySources:
    - "Chrome DevTools (Performance & Memory panels)"
    - "web.dev (INP / Core Web Vitals)"
    - "V8 heap snapshots"
  teachingApproach: "Start from a trace, not a theory — read what the profiler shows, then change one thing and re-measure."
  recall:
    - "From memory: name the stages of the pixel pipeline from style to screen, and say which ones a transform-only animation running on the compositor can skip."
    - "Before reading: why can a detached DOM node survive garbage collection, given how generational GC decides what to keep alive?"
    - "From memory: what is the 16.67ms frame budget, and why does a 200ms macrotask on the main thread block both rendering and input?"
---

# Module 3: Performance Engineering

Module 2 taught you *why* layout, paint, and composite cost what they cost. This module is the applied counterpart: *how do you find the cost in a real app and remove it?* Most "performance work" in the wild is guessing — someone reads a blog post, sprinkles `useMemo`, and ships. Performance **engineering** is a discipline with one rule: you do not optimize what you have not measured.

## 1. The Loop: Measure → Locate → Hypothesize → Fix → Re-measure
The order matters, and most people get it backwards.

* **Misconception — "optimize first, measure later."** You will spend hours speeding up code that runs once at startup while the real cost is a 200ms layout on every keystroke. Effort spent without a baseline is effort spent on the wrong thing.
* **The rule:** capture a trace *before* you touch anything, change **one** variable, capture an *after* trace, and compare. No before/after, no claim.
* **Misconception — "the bottleneck is where you think it is."** Intuition is reliably wrong about hot paths; the JIT (Module 1), the layout engine, and the network all surprise you. The profiler is the source of truth, not your mental model.

## 2. Reading a Flame Chart
Open the [Performance panel](https://developer.chrome.com/docs/devtools/performance/), record, and you get the main thread as a timeline of **tasks** — the top-level blocks are exactly Module 1's macrotasks.

* **Long tasks:** any [task over **50ms**](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming) blocks input the entire time; DevTools flags it with a red corner. Long tasks are the enemy of responsiveness (§5).
* **Categories by color:** yellow = **scripting**, purple = **rendering** (Recalculate Style + Layout), green = **painting**, grey = system/idle. The shape of the colors tells you the class of problem before you read a single function name.
* **Self time vs total time:** in the Bottom-Up view, sort by *self time* to find the function actually burning CPU, not its callers. The widest yellow band is your scripting bottleneck; a thin purple sliver *inside* a yellow task is layout being forced synchronously (§3).

## 3. Forced Synchronous Layout, Caught in the Act
The *mechanism* is Module 2; here is how it **appears** in a trace: a purple **Layout** event nested inside a yellow scripting task, with a warning triangle — *["Forced reflow is a likely performance bottleneck."](https://developer.chrome.com/docs/performance/insights/forced-reflow)*

The code shape is always the same — interleaving reads and writes so the browser must flush layout mid-loop:

```js
// BAD: each read of offsetHeight forces layout, because the previous
// write invalidated it — N reads = N synchronous layouts.
for (const el of items) {
  el.style.height = el.offsetHeight + 10 + 'px' // read-after-write, every iteration
}

// GOOD: batch all reads, then all writes — one layout for the whole loop.
const heights = items.map((el) => el.offsetHeight) // read phase
items.forEach((el, i) => (el.style.height = heights[i] + 10 + 'px')) // write phase
```

The fix is structural (read phase, then write phase), not a micro-optimization. [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) is the natural place to do the write phase.

<SelfTest>

A trace shows a single 180ms scripting task with a row of ~50 purple "Layout" slivers inside it, each flagged "Forced reflow." What is the code doing, and why does moving every DOM *read* to before every DOM *write* collapse 50 layouts into 1?

<template #answer>

The loop reads geometry — `offsetHeight`/`getBoundingClientRect` — after writing a style, so each read finds layout dirty and forces a synchronous recompute. Separating the phases means all writes dirty layout once, and the next read triggers exactly one flush.

</template>
</SelfTest>

<SelfTest variant="run">

Paste this into the console on any content-heavy page (this one works). Predict the `ratio` before you look — then reload to undo the visual mangling:

```js
const els = [...document.querySelectorAll('*')].slice(0, 400)

let t = performance.now()
for (const el of els) el.style.width = el.offsetWidth + 1 + 'px'   // read-after-write
const interleaved = performance.now() - t

t = performance.now()
const w = els.map((el) => el.offsetWidth)                          // all reads
els.forEach((el, i) => (el.style.width = w[i] + 1 + 'px'))         // all writes
const batched = performance.now() - t

console.log({ interleaved, batched, ratio: interleaved / batched })
```

<template #answer>

`interleaved` is far slower — commonly 10–50× on a page this size, widening with element count. Every write in the first loop invalidates layout, so the next `offsetWidth` forces a synchronous re-layout: ~400 flushes. The batched loop reads against one clean layout, then writes without reading, dirtying layout just once. The absolute milliseconds depend on the page and machine; the **ratio** and its cause — one forced reflow per read-after-write — are the invariant. This is §3's "purple slivers" reproduced on demand.

</template>
</SelfTest>

## 4. Memory: Snapshots, Retainers, and Detached DOM
Module 1 explained generational GC; this is how you find what the GC *can't* collect because you're still holding it.

* **The three-snapshot technique:** take a [heap snapshot](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots), perform the suspect action (open and close a modal, navigate a route) a few times, take another snapshot, and use the **Comparison** view to see objects allocated-but-not-freed between them. Steady growth across repetitions is a leak.
* **Detached DOM nodes:** filter the snapshot for [`Detached`](https://developer.chrome.com/docs/devtools/memory-problems/) — these are nodes removed from the document but kept alive by a JS reference (a closure, an event listener never removed, a node pushed into a module-level array). They're invisible on screen but cost memory forever.
* **The retainer path:** select the leaked object and read its **Retainers** bottom-up — the chain of references back to a GC root. The root is your bug: the array, the listener, the cache that never evicts.

```js
const cache = [] // module-level: a GC root
function render(node) {
  cache.push(node) // node can never be collected, even after it's removed from the DOM
}
// Fix: don't retain, or use a WeakRef / WeakMap so the node can be reclaimed.
```

<SelfTest>

Heap grows ~2MB on every client-side route change and never drops. A snapshot diff shows hundreds of detached `<div>` nodes retained by an object called `(array)`. How do you confirm the cause and fix it?

<template #answer>

Follow the retainer path from a detached node to its GC root — here a module-level array still pushing nodes. Confirm by checking the array grows once per navigation; fix by clearing it on unmount, scoping it to the component, or holding nodes weakly so GC can reclaim them.

</template>
</SelfTest>

## 5. Responsiveness: Long Tasks, INP, and Yielding
The metric that captures "does the app feel fast" is **[INP — Interaction to Next Paint](https://web.dev/articles/inp)**: the time from a user input to the next frame that reflects it. A long task sitting between the click and the paint is what wrecks it.

* **Break up long tasks:** instead of one 200ms task, yield to the event loop so queued input can run between chunks — [`await scheduler.yield()`](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield) (or `scheduler.postTask`, or a `setTimeout(0)` fallback). Check [`navigator.scheduling.isInputPending()`](https://developer.mozilla.org/en-US/docs/Web/API/Scheduling/isInputPending) to yield only when something's waiting.
* **Misconception — "60fps just needs `requestAnimationFrame`."** `rAF` is *timing*, not a *budget*. A `rAF` callback that runs 30ms of layout-thrashing work still blows the 16.67ms frame and drops frames. `rAF` schedules you before paint; it doesn't make your work cheap.
* **When to leave the main thread:** if the trace shows a CPU-bound scripting task that genuinely can't be chunked (a parse, an image filter, crypto), that's the signal to move it to a Web Worker — see [Module 10](/module-10-browser-apis) for the worker/transferable mechanics. The trace tells you *when*; Module 10 tells you *how*.

## 6. The Discipline
Two habits separate engineers who profile from engineers who guess:

* **Measure in production-like conditions.** Your dev machine lies. Use DevTools CPU throttling (4–6×) and test on a real mid-tier phone — the bottleneck on a throttled device is often nowhere near the one on an M-series laptop.
* **Make falsifiable claims.** "This is faster" is not a result; "p75 INP dropped from 240ms to 90ms on a 4× throttle" is. That honesty about measurement is the same judgment you'll sharpen in [Module 11](/module-11-source-code-judgment) — a benchmark that doesn't account for the JIT or warm-up is worse than no benchmark.

<SelfTest>

A colleague reports a function is "way faster" after a rewrite, timing it with `Date.now()` around a single call in dev. Name two reasons that number is meaningless, and what you'd capture instead.

<template #answer>

One call doesn't let the JIT reach steady state and `Date.now()` has coarse resolution; the dev machine isn't the target device. Capture: many warm iterations under CPU throttling with [`performance.now()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now), or better, a real Performance-panel trace on a throttled mid-tier device, reported as a percentile.

</template>
</SelfTest>
