---
title: "Course Syllabus · From Silicon to the Screen"
description: "The full curriculum, organized into four career-leverage tiers — from JS runtime internals and browser rendering to reactivity, compilers, performance engineering, systems design, and the platform frontier (WebAssembly, WebGPU, the edge, and browser security)."
---

# Course Syllabus: Now I Understand How Software Systems Execute

Let’s lay out a comprehensive curriculum that transforms a standard developer into an engineer who deeply understands execution from the silicon to the screen.

Not every topic here has equal career value, so the curriculum is organized into **four tiers** by leverage. Work top-down: each tier assumes the one above it, and the module numbers run in tier order — Tier 1 is modules 1–4, Tier 2 is 5–8, Tier 3 is 9–12, Tier 4 is 13–16.

| Tier | What it buys you | Modules |
| :--- | :--- | :--- |
| **1 · Non-Negotiable Foundation** | The bedrock every senior is assumed to have. Go until it’s intuitive. | 01 JS Runtime · 02 Browser as OS · 03 Performance Engineering · 04 Network Bridge |
| **2 · The Differentiators** | Where market value rises sharply — most senior devs never go here. | 05 Reactivity · 06 Data Structures · 07 Compilers · 08 Build Systems |
| **3 · Rare-Engineer Territory** | Build the things, read the masters, design the system. | 09 Build From Scratch · 10 Browser APIs · 11 Source-Reading · 12 Systems Design |
| **4 · The Platform Frontier** | Push execution past the platform's defaults: another language, another processor, another runtime — and the security model that gates them. | 13 WebAssembly · 14 WebGPU & Compute · 15 Edge & Streaming · 16 Browser Security |

---

## Tier 1 · Non-Negotiable Foundation
This is the floor, not the ceiling. If any of this is fuzzy, fix it before anything below. Study it until it’s reflexive.

### Module 1: Master JavaScript at the Runtime Level
Your goal is to understand JavaScript as a compiled runtime system, not just a scripting language.

**The Event Loop & Memory Model**
You must understand the exact scheduling order of macrotasks, microtasks, and the Promise queue, as well as how memory is allocated and reclaimed.

| Concept | Key Focus Areas | Practical Implication |
| :--- | :--- | :--- |
| **Concurrency** | [Microtask vs. Macrotask queues](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops), Starvation scenarios | Predicting exact execution order of promises and timeouts. |
| **Memory** | Stack vs. Heap, generational GC, Retainers, write barriers | Identifying leaks, detached DOM nodes, and observing collection with `FinalizationRegistry` without preventing it. |

> **Self-Test:**
>
> ```js
> Promise.resolve().then(() => console.log("A"))
> setTimeout(() => console.log("B"))
> queueMicrotask(() => console.log("C"))
> console.log("D")
> ```
>
> *Why does it print in exactly that order? Why do closures leak memory?*

**JavaScript Engine Internals (V8)**
You will study [hidden classes, inline caching](https://v8.dev/blog/fast-properties), deoptimization, and JIT compilation. You must understand why changing object shapes dynamically hurts performance through monomorphic vs. polymorphic call sites.

**The Prototype System**
Frameworks rely heavily on prototype chain lookups, property resolution, descriptors, and Proxy behavior. You will study how Vue.js utilizes [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) interception for its reactivity system.

### Module 2: Understand the Browser Like an Operating System
To write high-performance applications, you must know what the browser is doing every millisecond.

**The Rendering Pipeline & GPU Compositing**
This covers [DOM/CSSOM construction, layout calculations, painting, and compositing](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path). You will learn the difference between repaints, reflows, and hardware acceleration.

> **Self-Test:**
> Why is `element.style.width = "100px"; console.log(element.offsetWidth)` expensive? (Understand Layout Thrashing).
> Why is `transform: translateX(...)` fast, but `left: 100px` slow?

**Scheduling**
You will study frame budgets (the critical 16.67ms window), main thread contention, and APIs like [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) and [`requestIdleCallback`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback). Profiling and fixing these costs in DevTools is the subject of Module 3.

### Module 3: Performance Engineering
Module 2 taught *why* rendering costs what it does; this module is the discipline of *measuring and fixing* it. The rule is absolute: never optimize without a before-and-after trace.

* **Reading a Flame Chart:** Separate scripting, rendering, and paint; find the long task (>50ms) that blocks input.
* **Forced Reflow in the Trace:** Spot synchronous layout triggered mid-task, and fix it by batching DOM reads before writes.
* **Memory:** Heap snapshots, the three-snapshot technique, detached DOM nodes, and reading the retainer path to a leak.
* **Responsiveness:** [Interaction to Next Paint (INP)](https://developer.mozilla.org/en-US/docs/Glossary/Interaction_to_next_paint), breaking up long tasks ([`scheduler.postTask`](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask), yielding), and deciding from the trace when to move work off the main thread.

### Module 4: The Network & Execution Bridge
Code execution relies heavily on how assets are delivered and cached.

* **Delivery Protocols:** Understand [multiplexing in HTTP/2](https://www.rfc-editor.org/rfc/rfc9113.html) and UDP-based routing in HTTP/3.
* **[Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API):** Master the browser's programmable network proxy for offline execution and cache invalidation.
* **Real-Time Execution:** Compare connection overhead between WebSockets, [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events), and WebRTC.

---

## Tier 2 · The Differentiators
This is where your market value rises sharply. Most senior frontend devs never learn this layer — they consume frameworks instead of understanding them. Don’t skim; read source.

### Module 5: Deep Reactivity Systems
This module breaks down how modern frameworks propagate state.

* **Vue Reactivity:** Study the source code for [`track()`](https://vuejs.org/guide/extras/reactivity-in-depth.html), `trigger()`, `effect()`, and dependency maps.
* **Signals:** Analyze dependency graphs, fine-grained subscriptions, and invalidation propagation (reference: SolidJS).
* **Virtual DOM:** Master tree diffing, reconciliation heuristics, keyed updates, and patch algorithms (reference: React internals).
* **Compiler-Driven Reactivity:** Understand AST transforms and compile-time dependency analysis (reference: Svelte).

### Module 6: Practical Data Structures & Algorithms
We bypass theoretical interview questions to focus strictly on why frameworks utilize specific structures under the hood. This is the connective tissue of the tier — the structures the reactivity, compiler, and build modules all rest on.

| Structure | Framework Application | Example Use Case |
| :--- | :--- | :--- |
| **Trees** | Virtual DOM representations | Traversal and diffing of UI nodes. |
| **[WeakMaps](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)** | Dependency tracking | `WeakMap<object, Map<string, Set<Effect>>>` (Vue internals). |
| **Linked Lists** | Scheduler queues | Managing rendering tasks efficiently. |
| **Graphs** | Dependency propagation | Mapping relationships between reactive state. |

### Module 7: Code as Data (Compilers & ASTs)
This is where you bridge the gap between authoring code and executing it.

* **Lexing & Parsing:** Turning raw text into tokens, and tokens into an Abstract Syntax Tree (AST).
* **AST Transforms:** Manipulating syntax trees and generating executable code.
* **Static Analysis:** Understanding how tools like esbuild and Vite detect patterns for dead code elimination, tree shaking, and linting.

> **Self-Test:**
> How exactly does `<div>{{ message }}</div>` become executable JavaScript via compiler logic?

### Module 8: Build Systems
The compiler turns one file into executable code; the build system orchestrates *thousands* of them — twice, with opposite strategies for dev and production.

* **Module Resolution:** Bare specifiers, the `exports` field, ESM vs. CommonJS, why the browser can’t resolve `import 'vue'` on its own, and native **import maps** as the browser's own resolver.
* **The Dev Server:** Vite’s native-ESM, transform-on-demand model; esbuild dependency pre-bundling ([`optimizeDeps`](https://vite.dev/guide/dep-pre-bundling.html)); why dev startup is O(1) in app size.
* **HMR:** The module graph, accept boundaries ([`import.meta.hot`](https://vite.dev/guide/api-hmr.html)), and why component state survives an edit.
* **Production Build:** Rollup, code splitting, tree shaking, the dev/prod two-engine consistency tradeoff (and Rolldown’s push to unify them), and **Module Federation** for sharing dependencies across separately-built apps at runtime.

---

## Tier 3 · Rare-Engineer Territory
This is where you stop consuming abstractions and start producing them. Build the systems, read code written by people much stronger than you, and push execution past JavaScript itself.

### Module 9: Build Difficult Things from Scratch
True mastery requires implementation. You will build simplified versions of complex systems.

* **Virtual Scroller:** Handle dynamic heights, DOM node recycling, and viewport calculations.
* **Reactive Engine:** Build `signal()`, `computed()`, and `effect()` from scratch.
* **Mini Framework:** Create a `<Counter />` component with reactive updates, template compilation, and DOM patching.
* **State Management System:** Implement subscriptions, persistence, and transaction batching (similar to Pinia internals).
* **Bundler:** Build a simplified module resolution tool like Vite.

### Module 10: Browser APIs as Architecture
A set of platform APIs that all answer the same two questions: *observe without polling*, and *get work off the one main thread*. Knowing why each exists lets you pick the right one before profiling proves the naïve version wrong.

* **The Observer Family:** `MutationObserver`, `ResizeObserver`, [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) — delivery timing and why they replace scroll/timer polling.
* **Web Workers:** A second thread, structured-clone cost, and transferables for zero-copy handoff.
* **[SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) & Atomics:** True shared memory, the cross-origin-isolation requirement, and race-free coordination.
* **OffscreenCanvas:** Rendering decoupled from the DOM and driven from a worker.

### Module 11: Source Code Reading & Technical Judgment
Advanced engineers read code not just to contribute, but to understand foundational design decisions.

* **Target Repositories:** Vue.js, Vite, TypeScript, esbuild, React.
* **System Design:** Learn to write system diagrams, tradeoff analyses, and RFCs (Request for Comments).
* **Communication:** Develop the judgment to accurately state, "This architecture will fail in 18 months because state propagation complexity is wrong."

### Module 12: Systems Design & Complexity Management
Every module above answers *how does this execute?* This one answers the orthogonal question every senior is paid for: *how do you keep a system changeable after three years?* The enemy is complexity, not slowness.

* **Coupling & Cohesion:** Change amplification, abstraction boundaries, and information hiding — modularize around what changes, not the steps of a process.
* **API Design:** Designing for the caller, Hyrum's Law, and the cost of breaking changes.
* **State & Cache:** Single source of truth, derived vs. stored state, and cache invalidation as a correctness problem.
* **Concurrency & Judgment:** Reasoning about invariants across `await`/yield points, and defending tradeoffs in writing (ADRs, one-way vs. two-way doors).

---

## Tier 4 · The Platform Frontier
The first three tiers make you fluent in how the web platform executes *as given*. This tier is for the engineers who push past its defaults — running code that isn't JavaScript, on a processor that isn't the CPU, in a runtime that isn't the browser — and the security architecture that makes the platform willing to grant that power. Each frontier capability reopens a door the platform had to learn to guard; the throughline is *power and containment ship together*.

### Module 13: WebAssembly & Systems Integration
Execution past JavaScript: a typed stack machine compiled to near-native code.

* **Execution & Engine:** The typed stack machine, one-pass validation, `Module` vs `Instance`, and the Liftoff→TurboFan tiers (why speed comes from static types, not AOT).
* **Memory & Boundary:** Linear memory as one `ArrayBuffer`, `memory.grow` detaching views, WasmGC, and the real JS↔Wasm cost — numbers are cheap, strings/objects pay an encode + `memcpy`.
* **Porting Native Code:** Compile a Rust kernel to Wasm; allocate the buffer once and pass a pointer, not the data — and why `wasm-bindgen` automates that copy rather than removing it.
* **Threads & Beyond:** `SharedArrayBuffer` + atomics (requires cross-origin isolation — Module 16), SIMD, WASI, and the Component Model.

### Module 14: WebGPU & Compute Shaders
Execution past the CPU: thousands of lanes running the same instruction over different data.

* **The GPU Model:** SIMT/data-parallel execution; why branch divergence and low arithmetic intensity kill the win.
* **The Pipeline:** `navigator.gpu` → adapter → device → queue; buffers, usage flags, and bind groups.
* **Compute Shaders (WGSL):** Workgroups, `@workgroup_size`, `global_invocation_id`, and sizing `dispatchWorkgroups` correctly.
* **The Readback Wall:** Why a `STORAGE` buffer needs a `MAP_READ` staging copy, and why reading results back dominates a small job. WebGPU vs Workers (M10) vs Wasm (M13).

### Module 15: Edge Runtimes & Streaming
Execution past the browser: code running in V8 isolates near the user, streamed back progressively.

* **Isolates vs Processes:** Why edge runtimes use V8 isolates (millisecond cold starts, density) instead of Node processes, and the constraint surface that forces (no `fs`, Web-standard APIs, CPU-time caps).
* **Chunked Transfer Encoding:** Streaming a response body before its length is known; TTFB vs renderable bytes.
* **Streaming SSR & RSC:** Flushing the shell while awaiting data, Suspense boundaries as flush points, and serializing the React tree to the RSC wire payload.

### Module 16: Browser Security Architecture
Platform-level security as an architecture, derived from the attacks that forced it.

* **Process Model & Spectre:** Site isolation as memory separation; why speculative execution + a cache side channel made multi-process mandatory.
* **Cross-Origin Isolation:** How COOP + COEP (+ CORP) earn back `SharedArrayBuffer` and high-resolution timers (the precondition Modules 10 and 13 require).
* **Trusted Types & CSP:** Killing DOM-based XSS at the sink, and layering a strict, nonce-based CSP — complementary, not interchangeable.
