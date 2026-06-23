# Module 11: Browser APIs as Architecture

The APIs in this module — the observers, Web Workers, `SharedArrayBuffer`, `OffscreenCanvas` — look like a grab-bag of utilities. They aren't. Every one of them exists to solve **the same two problems**: *observe a change without polling for it*, and *get work off the single main thread*. Once you see them as answers to those two questions, "which API and why" stops being trivia and becomes architecture. The reader's intuition usually reaches for a `scroll` listener and a `setInterval`; this module is about why a senior reaches for something else.

## 1. The Observer Family: Don't Poll, Be Notified
Before observers, watching for "did this element resize / scroll into view / change?" meant running code on every `scroll`/`resize` event or on a timer — and *each check that reads geometry forces a synchronous layout* (the thrashing problem from [Module 2](/module-2-browser-os)). Observers move that work into the browser, batched and delivered at the right moment.

* **`MutationObserver` — DOM tree changes:** Watches node insertions/removals/attribute changes. Callbacks are delivered as a **microtask** (it rides the same queue as `Promise.then`, from [Module 1](/module-1-js-runtime)) — so a burst of DOM mutations in one task is coalesced into a single callback with a *list* of records, not one callback per mutation.
* **`ResizeObserver` — element size changes:** Fires when an element's content box changes, for *any* reason (not just window resize). Delivery timing is the subtle part: it runs **after layout, before paint**, so it observes already-computed sizes. The spec runs observations in a loop with a depth guard — if your callback resizes an observed element, triggering another layout, you'll hit **`ResizeObserver loop limit exceeded`**. That's not a crash; the browser defers the remaining notifications to the next frame to break the cycle. Seeing that warning means your callback is fighting the layout it's reacting to.
* **`IntersectionObserver` — visibility:** Reports when an element crosses a `threshold` of overlap with a `root` (default: the viewport), expandable via `rootMargin`. The intersection math runs **asynchronously, off the main thread**, and is delivered post-render — which is exactly why it replaced scroll-listener visibility checks for lazy-loading images and infinite scroll. No layout thrash, no scroll-handler jank.

> **Self-Test:**
> A lazy-image implementation uses a throttled `scroll` listener that reads `getBoundingClientRect()` on every image; it janks. Why does swapping to `IntersectionObserver` fix the *cause*, not just the symptom? (The scroll handler forces a synchronous layout on every fire to read rects — work on the main thread, in the scroll critical path. `IntersectionObserver` computes intersections asynchronously off the main thread and notifies only on threshold crossings, so the per-scroll layout cost disappears entirely instead of being merely throttled.)

## 2. Web Workers: A Second Thread, at a Price
Your JS runs on *one* main thread shared with layout and paint (Module 2). CPU-bound work — parsing a big file, image processing, crypto — blocks rendering and input. A **Web Worker** runs script on a separate OS thread with its own event loop.

* **Isolation is the whole point:** A worker has **no DOM access** and no shared variables. It communicates only via `postMessage`. This is deliberate — no shared mutable state means no locks, no data races on the DOM.
* **The hidden cost — structured clone:** `postMessage(obj)` doesn't pass a reference; it **deep-copies** `obj` via the structured clone algorithm. For a large object graph that copy can cost more than the work you offloaded. The decision rule: offload only when *compute time ≫ clone time*.
* **Transferables — zero-copy escape hatch:** You can **transfer ownership** of an `ArrayBuffer`, `MessagePort`, `ImageBitmap`, or `OffscreenCanvas` instead of copying it: `worker.postMessage(buf, [buf])`. Ownership moves to the worker and the buffer is **neutered** (zero-length) on the sender's side — the memory is handed over, not duplicated. This is how you move megabytes across the thread boundary for free.

## 3. SharedArrayBuffer & Atomics: Actually Shared Memory
Transferables move ownership; sometimes you need *two threads reading and writing the same bytes simultaneously*. `SharedArrayBuffer` (SAB) is linear memory visible to multiple threads at once — no copy, no transfer.

* **Why it was disabled, and the price of re-enabling it:** SAB gives you a high-resolution shared timer, which is a Spectre side-channel ingredient. It's only available in a **cross-origin isolated** context — you must send `COOP: same-origin` and `COEP: require-corp` headers. Those headers also restrict which cross-origin resources you can embed. That isolation requirement is the same site-isolation security model from [Module 2](/module-2-browser-os), surfaced as an opt-in cost.
* **Shared memory means data races — `Atomics` is the fix:** Two threads writing the same SAB slot is undefined without synchronization. `Atomics.add`, `Atomics.compareExchange`, etc. perform race-free read-modify-write. `Atomics.wait(view, i, expected)` **blocks** a worker thread until `Atomics.notify` wakes it — a real semaphore. `wait` is forbidden on the main thread (blocking it would freeze the page), which tells you the intended shape: workers coordinate via SAB while the main thread stays responsive.
* This is the same machinery WebAssembly threads use — see [Module 9](/module-9-wasm) for the Wasm side of shared linear memory.

> **Self-Test:**
> You add a Web Worker that uses `SharedArrayBuffer`, but `crossOriginIsolated` is `false` and the SAB constructor isn't even defined. What's missing, and why does the platform make you jump through it? (You haven't sent `COOP: same-origin` + `COEP: require-corp`, so the document isn't cross-origin isolated. SAB exposes precise shared-memory timing usable in a Spectre attack, so browsers gate it behind isolation that guarantees no untrusted cross-origin content shares your process.)

## 4. OffscreenCanvas: Rendering Without the DOM
Canvas rendering normally happens on the main thread, tied to a DOM `<canvas>`. A heavy chart or WebGL scene then competes with layout, paint, and input. **`OffscreenCanvas`** decouples the drawing surface from the DOM so it can be driven from a worker.

* **The mechanism:** `const off = canvas.transferControlToOffscreen()` hands the canvas's backing surface to an `OffscreenCanvas` object (a transferable — §2), which you `postMessage` into a worker. The worker draws (`2d` or `webgl`) and the result composites to screen without touching the main thread. You can also `new OffscreenCanvas(w, h)` with no DOM element at all, for pure off-thread image generation.
* **Why it matters:** rendering and rasterization for that surface move off the main thread, so a complex visualization can animate smoothly even while the main thread is busy — the same "keep work off the one contended thread" theme as workers, applied to pixels.

## The Throughline
Every API here is the browser handing you a way to *not* do work on the main thread, or to *not* poll: observers notify instead of you checking; workers compute elsewhere; SAB shares memory instead of copying; OffscreenCanvas draws elsewhere. When you reach the [from-scratch builds](/module-6-build-things) in Module 6 — a virtual scroller, a scheduler — these are the primitives you compose. Knowing *why each exists* is what lets you pick the right one before profiling tells you the naïve version was wrong.

> **Self-Test:**
> Name the single architectural pressure that motivates `IntersectionObserver`, Web Workers, *and* `OffscreenCanvas`. (The browser gives your page exactly **one main thread**, shared by JS, layout, paint, and input. Each API is a different strategy for not overloading it — observe without main-thread polling, compute on another thread, render on another thread. The constraint is the thread; the APIs are the relief valves.)
