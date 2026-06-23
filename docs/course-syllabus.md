# Course Syllabus: Now I Understand How Software Systems Execute

Let’s lay out a comprehensive curriculum that transforms a standard developer into an engineer who deeply understands execution from the silicon to the screen.

---

## Module 1: Master JavaScript at the Runtime Level
Your goal is to understand JavaScript as a compiled runtime system, not just a scripting language.

**The Event Loop & Memory Model**
You must understand the exact scheduling order of macrotasks, microtasks, and the Promise queue, as well as how memory is allocated and reclaimed.

| Concept | Key Focus Areas | Practical Implication |
| :--- | :--- | :--- |
| **Concurrency** | Microtask vs. Macrotask queues, Starvation scenarios | Predicting exact execution order of promises and timeouts. |
| **Memory** | Stack vs. Heap, Garbage collection, Retainers | Identifying accidental memory leaks and detached DOM nodes. |

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
You will study hidden classes, inline caching, deoptimization, and JIT compilation. You must understand why changing object shapes dynamically hurts performance through monomorphic vs. polymorphic call sites.

**The Prototype System**
Frameworks rely heavily on prototype chain lookups, property resolution, descriptors, and Proxy behavior. You will study how Vue.js utilizes Proxy interception for its reactivity system.

---

## Module 2: Understand the Browser Like an Operating System
To write high-performance applications, you must know what the browser is doing every millisecond.

**The Rendering Pipeline & GPU Compositing**
This covers DOM/CSSOM construction, layout calculations, painting, and compositing. You will learn the difference between repaints, reflows, and hardware acceleration.

> **Self-Test:**
> Why is `element.style.width = "100px"; console.log(element.offsetWidth)` expensive? (Understand Layout Thrashing).
> Why is `transform: translateX(...)` fast, but `left: 100px` slow?

**Scheduling & Profiling**
You will master Chrome DevTools, focusing on flame graphs, memory snapshots, and forced reflow detection. You will also study frame budgets (the critical 16.67ms window), main thread contention, and APIs like `requestAnimationFrame` and `requestIdleCallback`.

---

## Module 3: Deep Reactivity Systems
This module breaks down how modern frameworks propagate state.

* **Vue Reactivity:** Study the source code for `track()`, `trigger()`, `effect()`, and dependency maps.
* **Signals:** Analyze dependency graphs, fine-grained subscriptions, and invalidation propagation (reference: SolidJS).
* **Virtual DOM:** Master tree diffing, reconciliation heuristics, keyed updates, and patch algorithms (reference: React internals).
* **Compiler-Driven Reactivity:** Understand AST transforms and compile-time dependency analysis (reference: Svelte).

---

## Module 4: Practical Data Structures & Algorithms
We bypass theoretical interview questions to focus strictly on why frameworks utilize specific structures under the hood.

| Structure | Framework Application | Example Use Case |
| :--- | :--- | :--- |
| **Trees** | Virtual DOM representations | Traversal and diffing of UI nodes. |
| **WeakMaps** | Dependency tracking | `WeakMap<object, Map<string, Set<Effect>>>` (Vue internals). |
| **Linked Lists** | Scheduler queues | Managing rendering tasks efficiently. |
| **Graphs** | Dependency propagation | Mapping relationships between reactive state. |

---

## Module 5: Code as Data (Compilers & ASTs)
This is where you bridge the gap between authoring code and executing it.

* **Lexing & Parsing:** Turning raw text into tokens, and tokens into an Abstract Syntax Tree (AST).
* **AST Transforms:** Manipulating syntax trees and generating executable code.
* **Static Analysis:** Understanding how tools like esbuild and Vite detect patterns for dead code elimination, tree shaking, and linting.

> **Self-Test:**
> How exactly does `<div>{{ message }}</div>` become executable JavaScript via compiler logic?

---

## Module 6: Build Difficult Things from Scratch
True mastery requires implementation. You will build simplified versions of complex systems.

* **Virtual Scroller:** Handle dynamic heights, DOM node recycling, and viewport calculations.
* **Reactive Engine:** Build `signal()`, `computed()`, and `effect()` from scratch.
* **Mini Framework:** Create a `<Counter />` component with reactive updates, template compilation, and DOM patching.
* **State Management System:** Implement subscriptions, persistence, and transaction batching (similar to Pinia internals).
* **Bundler:** Build a simplified module resolution tool like Vite.

---

## Module 7: Source Code Reading & Technical Judgment
Advanced engineers read code not just to contribute, but to understand foundational design decisions.

* **Target Repositories:** Vue.js, Vite, TypeScript, esbuild, React.
* **System Design:** Learn to write system diagrams, tradeoff analyses, and RFCs (Request for Comments).
* **Communication:** Develop the judgment to accurately state, "This architecture will fail in 18 months because state propagation complexity is wrong."

---

## Module 8: The Network & Execution Bridge
Code execution relies heavily on how assets are delivered and cached.

* **Delivery Protocols:** Understand multiplexing in HTTP/2 and UDP-based routing in HTTP/3.
* **Service Workers:** Master the browser's programmable network proxy for offline execution and cache invalidation.
* **Real-Time Execution:** Compare connection overhead between WebSockets, Server-Sent Events, and WebRTC.

---

## Module 9: WebAssembly & The Future Runtime
As browsers handle heavier workloads, execution extends beyond JavaScript.

* **Wasm Memory Model:** Understand linear memory allocation and how Wasm interacts with the JS garbage collector.
* **The JS/Wasm Boundary:** Analyze the performance cost of passing complex data structures between JavaScript and compiled C++/Rust.
