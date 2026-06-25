---
title: "Module 13 · WebAssembly & Systems Integration"
description: "How WebAssembly executes: the typed stack machine, Liftoff/TurboFan tiers, linear memory, the JS↔Wasm boundary cost, WasmGC, cross-origin isolation, and porting a native Rust kernel without paying a per-call copy."
learn:
  module: 13
  level: advanced
  timeRequired: PT40M
  prerequisites:
    - "JIT tiers & the heap (module 1)"
    - "streaming compilation (module 3)"
    - "Browser APIs / Workers (module 10)"
    - "typed arrays / ArrayBuffer"
  outcomes:
    - "Explain why a chatty JS↔Wasm boundary can be slower than plain JS"
    - "Reason about linear-memory growth detaching existing views"
    - "Know when cross-origin isolation (COOP/COEP) is required"
    - "Port a CPU-bound kernel to Wasm and pass data by pointer, not by copy"
  concepts:
    - "typed stack machine (no heap in the MVP)"
    - "one-pass validation"
    - "Module vs Instance"
    - "imports / exports"
    - "Liftoff (baseline) + TurboFan (optimizing)"
    - "streaming compilation"
    - "linear memory (ArrayBuffer)"
    - "memory.grow detaching views"
    - "WasmGC"
    - "the JS↔Wasm boundary cost"
    - "SharedArrayBuffer + atomics"
    - "cross-origin isolation (COOP/COEP)"
    - "porting native code (wasm-bindgen glue)"
    - "pass-by-pointer vs copy-per-call"
  misconceptions:
    - "Wasm is AOT-compiled at install (it is still JIT'd Liftoff→TurboFan; speed comes from static types)"
    - "strings cross the boundary for free (each call needs a UTF-8 encode + memcpy)"
    - "Wasm always beats JS (frequent boundary crossing can lose to plain JS)"
    - "Wasm has no GC (true of the MVP core, but WasmGC adds a host-managed heap)"
    - "wasm-bindgen lets you pass JS objects in for free (it copies them into linear memory under the hood)"
  selfTests: 3
  primarySources:
    - "V8 (Liftoff / TurboFan)"
    - "Emscripten"
    - "wasm-bindgen"
    - "WebAssembly spec"
  teachingApproach: "Follow one function call across the JS↔Wasm boundary and account for every copy."
---

# Module 13: WebAssembly & Systems Integration

As browsers handle heavier workloads (video editing, 3D, heavy data processing), execution extends beyond JavaScript. WebAssembly (Wasm) is a binary instruction format designed as a portable compilation target for C, C++, Rust, and more. This is the first module of **Tier 4 · The Platform Frontier** — where you stop optimizing JavaScript and start running code that isn't JavaScript at all.

## 1. The Execution Model
Wasm is not "JS but faster" — it's a different machine.

* **Stack machine:** Wasm bytecode is a [typed stack machine](https://webassembly.github.io/spec/core/exec/index.html). Instructions push/pop typed values; there are no syntax ambiguities to parse, and the **MVP core has no managed heap to scan** — it operates on raw linear memory (§3). (WasmGC, §3, later *adds* a host-managed heap; the "no GC" property is true of the MVP core, not of Wasm forever.) This is *why* the core is fast to decode and validate.
* **Validation:** Before running, the module is **[validated](https://webassembly.github.io/spec/core/valid/index.html)** in a single pass — types and stack effects are proven sound. A validated module cannot crash the host or read outside its memory; safety is structural, not checked at runtime.
* **Module → Instance:** A `Module` is the compiled code (cacheable, shareable). An `Instance` binds it to its **imports** (functions/memory the host provides) and **exports** (what you call from JS). Always instantiate from the stream:

```js
const { instance } = await WebAssembly.instantiateStreaming(
  fetch("m.wasm"),
  imports
)
instance.exports.add(2, 3) // direct call into compiled machine code
```

> **Gotcha:** [`instantiateStreaming`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static) requires the response to be served with `Content-Type: application/wasm`. A wrong MIME type silently falls back (or throws), so this is a common "why is my Wasm slow to start" bug.

## 2. The Engine Pipeline (Ties Back to Module 1)
Wasm still goes through a JIT in V8 — just a more predictable one than JavaScript's:

* **[Liftoff](https://v8.dev/blog/liftoff)** — a baseline compiler that emits machine code in a single fast pass, so execution starts almost immediately. It exists precisely to kill startup latency: waiting for TurboFan to optimize every function up front would stall the first call, so Liftoff trades peak speed for an instant start.
* **TurboFan** — the optimizing compiler recompiles hot functions in the background for peak speed.

(This Liftoff→TurboFan tiering is V8-specific; SpiderMonkey and JavaScriptCore have their own.) Combined with **[streaming compilation](https://v8.dev/blog/v8-release-65)** (Module 3), a `.wasm` file compiles *while it downloads*. The reason Wasm reaches near-native throughput isn't that it's AOT-compiled — it's still JIT'd — but that its **static types and structured control flow mean no shape guards and no deoptimization**: the speculative bets that make JS fast-but-fragile (Module 1) simply don't exist here.

## 3. The Memory Model
Wasm doesn't allocate objects on a GC heap the way JS does.

* **[Linear memory](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Memory):** A single contiguous, resizable `ArrayBuffer` of bytes. To the module it's one giant array; it manages its own allocation (`malloc`/`free`) inside it.
* **`memory.grow` detaches views:** Memory can grow (never shrink) — but growing may **reallocate the underlying `ArrayBuffer`**, which *detaches every existing typed-array view* (`Uint8Array`, etc.) into it. Any JS-side view you cached is now stale and throws on access; you must re-create views after a grow. (This bites the §4 "expose a view" pattern directly.)
* **[WasmGC](https://v8.dev/blog/wasm-gc-porting):** Historically, languages targeting Wasm had to compile **their own garbage collector into the `.wasm`** — bloating the binary and running a second collector alongside the host's. **WasmGC** (shipped in Chrome/V8 119, late 2023) lets modules allocate objects the **host** GC manages, so GC'd languages (Java, Kotlin, Dart, OCaml) compile to compact Wasm without shipping a collector.

## 4. The JS ↔ Wasm Boundary (The Real Cost)
Crossing the boundary is cheap for numbers and expensive for everything else.

* **Numbers are free-ish:** Passing `i32`/`f64` is a near-direct call (it still goes through a JS→Wasm trampoline, so it's not literally free in a hot loop — but there's no copying).
* **Why strings/objects are expensive:** Wasm functions only speak numbers and their own linear memory. A JS string has no Wasm representation — so the glue must **encode it to UTF-8 bytes, copy them into linear memory, pass a `(pointer, length)` pair**, and the module decodes from there. That copy *is* the "serialization cost." [`wasm-bindgen`](https://github.com/wasm-bindgen/wasm-bindgen) and [Emscripten](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/index.html) generate exactly this glue; it's not magic, it's `TextEncoder` + a memcpy.
* **The implication:** One big computation across the boundary = huge win. Thousands of tiny crossings per frame (e.g. driving the DOM string-by-string) = often *slower* than plain JS, because copy + boundary overhead dominates.

> **Self-Test:**
> You move an image filter to Rust/Wasm and it's *slower* than the JS version. The pixels are a `Uint8Array`. What's the likely cause, and what's the fix? (Likely: you're copying the buffer across the boundary every call. Fix: allocate the pixel buffer *inside* Wasm linear memory once, expose it as a typed-array view, and mutate in place — pass a pointer, not the data. And remember §3: if the module ever calls `memory.grow`, re-create that view.)

## 5. Threads & The Future Runtime
This is where "beyond JavaScript" gets real.

* **Threads:** Wasm threads use a **`SharedArrayBuffer`** as shared linear memory across Web Workers, with **atomics** for synchronization — true parallelism the single-threaded JS event loop (Module 1) can't offer. It requires **[cross-origin isolation](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated)** (the `COOP`/`COEP` headers), because a shared, high-resolution memory buffer reopens the Spectre timing-attack surface that those headers wall off — the security mechanics are Module 16.
* **[SIMD](https://github.com/WebAssembly/simd):** 128-bit vector instructions process multiple lanes per op — big for media and ML kernels.
* **WASI & the Component Model:** The **[WebAssembly System Interface](https://github.com/WebAssembly/WASI)** standardizes capabilities (files, clocks, sockets) so Wasm runs outside the browser — on edge runtimes and servers (Module 15). The **Component Model** defines language-agnostic interfaces so a Rust module and a Python module can compose by contract. This is the actual "future runtime": one portable, sandboxed binary format from the browser tab to the edge node.

> **Self-Test:**
> Wasm threads need `SharedArrayBuffer`, which a plain page can't use without sending `COOP`/`COEP` headers. Why does sharing a buffer across threads specifically re-enable Spectre-style attacks — and what do those headers cut off? (A shared buffer + atomics gives an attacker a high-resolution timer and a way to observe cache effects across origins; cross-origin isolation severs the page from cross-origin documents/resources that could be used as the read gadget.)

## 6. Porting Native Code (A Worked Example)
The boundary rule from §4 — *pass a pointer, not the data* — stays abstract until you port something. Here is the whole pattern for a CPU-bound kernel: invert the RGBA pixels of an image, the kind of per-pixel loop where JS's number boxing and bounds checks cost you and a compiled language doesn't.

### The Rust side: own the buffer, expose a pointer
Compiled with `cargo build --target wasm32-unknown-unknown --release` — no runtime, no bundler, just a `.wasm`:

```rust
use std::alloc::{alloc, dealloc, Layout};

// Hand JS a block of linear memory it can write pixels into.
#[no_mangle]
pub extern "C" fn alloc_buf(len: usize) -> *mut u8 {
    let layout = Layout::from_size_align(len, 1).unwrap();
    unsafe { alloc(layout) }
}

#[no_mangle]
pub unsafe extern "C" fn dealloc_buf(ptr: *mut u8, len: usize) {
    dealloc(ptr, Layout::from_size_align(len, 1).unwrap());
}

// The kernel: mutate the bytes in place. No copy, no return value.
#[no_mangle]
pub unsafe extern "C" fn invert(ptr: *mut u8, len: usize) {
    let pixels = std::slice::from_raw_parts_mut(ptr, len);
    for px in pixels.chunks_exact_mut(4) {   // RGBA
        px[0] = 255 - px[0];                 // R
        px[1] = 255 - px[1];                 // G
        px[2] = 255 - px[2];                 // B
        // px[3] (alpha) left alone
    }
}
```

No `Vec<u8>` crosses the boundary and nothing is serialized. `invert` receives two `i32`s — a pointer and a length — exactly the cheap case from §4.

### The JS side: write once, call, read the same bytes
```js
const { instance } = await WebAssembly.instantiateStreaming(fetch("kernel.wasm"))
const { memory, alloc_buf, dealloc_buf, invert } = instance.exports

function processImage(imageData) {            // imageData.data: Uint8ClampedArray
  const len = imageData.data.length
  const ptr = alloc_buf(len)                  // reserve space *inside* linear memory

  // One copy in: JS pixels -> Wasm memory at `ptr`.
  const view = new Uint8Array(memory.buffer, ptr, len)
  view.set(imageData.data)

  invert(ptr, len)                            // mutate in place — zero crossings per pixel

  imageData.data.set(view)                    // one copy out
  dealloc_buf(ptr, len)
  return imageData
}
```

You pay **two `memcpy`s total** (in and out), not one per pixel. The `4·width·height`-iteration loop runs entirely inside compiled Rust — no boxing, no inline-cache shapes, no deopt (Module 1).

### The trap from §3: a grow invalidates your view
If anything between `alloc_buf` and your last `view` access can grow memory (a `malloc` inside the kernel, another allocation), the `ArrayBuffer` may reallocate and **detach `view`** — the next `view.set` throws. Re-derive the view against the current buffer after any call that might grow:

```js
const freshView = (ptr, len) => new Uint8Array(memory.buffer, ptr, len)
```

### wasm-bindgen does exactly this — don't let it hide the cost
[`wasm-bindgen`](https://github.com/wasm-bindgen/wasm-bindgen) lets you write `pub fn invert(pixels: &mut [u8])` and call `invert(jsArray)` directly. Convenient — but it generates the *same* `alloc` + copy-in + pointer-pass + copy-out you just wrote by hand. It is not free; it is automated. Call it once per small tile in a hot loop and you are back to per-call copies, and may lose to plain JS. The §4 model doesn't change because a tool wrote the glue.

> **Self-Test:**
> Your `invert` kernel is correct, but a teammate "optimizes" it by calling Wasm once per 16×16 tile (to parallelize later) and throughput drops below the original JS. Why — and what stayed expensive even though no pixel data is "returned"? *(Each tile call does its own `alloc` + copy-in + copy-out across the boundary; with hundreds of tiles per frame the fixed per-call copy + trampoline overhead dominates the tiny compute per tile. Mutating "in place" doesn't help when you re-establish and re-copy the buffer every call. One call over the whole frame — or one shared buffer reused across tile calls with no re-copy — is what makes Wasm win.)*
