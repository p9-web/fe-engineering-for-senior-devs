---
title: "Module 8 · Build Systems"
description: "How a file on disk becomes code in the browser — twice: native-ESM dev servers, esbuild pre-bundling, HMR via the module graph, and Rollup production bundling."
learn:
  module: 8
  level: advanced
  timeRequired: PT40M
  prerequisites:
    - "tree shaking & ESM vs CJS (module 7)"
    - "how code runs (module 1)"
    - "ESM import syntax"
  outcomes:
    - "Explain why a file that exists on disk is still unreachable (the exports allowlist)"
    - "Explain why editing a leaf component is instant but editing a shared store reloads the page"
    - "Name the structural reasons a feature works in dev but breaks in the build"
  concepts:
    - "module resolution (exports field, conditions, bare specifiers)"
    - "import maps (browser-native specifier resolution)"
    - "native-ESM dev server (transform on demand)"
    - "dependency pre-bundling (optimizeDeps)"
    - "why esbuild is fast (native, parallel, single-pass)"
    - "HMR (module graph, accept boundaries)"
    - "Rollup production build"
    - "code splitting"
    - "module federation (runtime dependency sharing)"
    - "tree shaking (side-effect hints)"
    - "the asset graph"
    - "the two-engine dev/prod consistency gap"
    - "Rolldown"
  misconceptions:
    - "the exports field is just a default-entry pointer (it is an allowlist firewall — unlisted subpaths are sealed even if the file exists)"
    - "the dev server bundles your app (Vite serves your code unbundled over native ESM; only dependencies are pre-bundled)"
    - "esbuild is fast because it skips GC (it is native code + parallelism + minimal AST passes)"
    - "HMR just reloads the changed file (it walks the graph up to an accept boundary; no boundary means a full reload)"
    - "Module Federation is build-time linking (it resolves and shares remotes at runtime, so version skew is a production failure)"
  selfTests: 4
  primarySources:
    - "Vite"
    - "esbuild"
    - "Rollup"
    - "Node package exports resolution"
    - "Rolldown"
  teachingApproach: "Follow one import from disk to browser in dev, then again through the production engine, and contrast the two."
---

# Module 8: Build Systems

Most developers run `npm run dev` and `npm run build` without asking why those two commands run *different engines* over the same source. A build system answers one question — **how does a file on disk become executable code in the browser?** — but it answers it twice, with opposite strategies for dev and production. Understanding both is what separates someone who *configures* Vite from someone who can debug it.

## 1. Module Resolution: Turning a String into a File
Before anything executes, every `import` specifier must resolve to a concrete file. There are three kinds, and the rules differ.

* **Relative (`./util.js`) and absolute (`/src/util.js`):** Resolved against the importer's path. The browser's native ESM loader does exactly this and nothing more — which is why bare specifiers fail in the browser.
* **Bare specifiers (`import { ref } from 'vue'`):** Have *no* meaning to the browser. Node's resolution algorithm walks up `node_modules`, reads the package's `package.json`, and consults the **[`exports` field](https://nodejs.org/api/packages.html#exports)** — the modern entry map that replaced `main`. `exports` also encodes **[conditions](https://nodejs.org/api/packages.html#conditional-exports)**: `import` vs `require`, `browser` vs `node`, `development` vs `production`. The same specifier can resolve to different files depending on who's asking. This is the part seniors most often get wrong: `exports` is a *firewall* — if a subpath isn't listed, it's unreachable, even if the file exists on disk.
* **Extension & directory resolution:** `./util` → `./util.ts` → `./util/index.ts`. Cheap to write, but every guess is a filesystem `stat`. A bundler caches these; the browser can't, which feeds directly into the dev-server design below.
* **Import maps — the browser's own resolver:** The browser can't resolve `import 'vue'` by itself, but [import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap) let you teach it to. A `<script type="importmap">` declares a JSON map from bare specifiers to URLs, so `import 'vue'` resolves to a real (often CDN) URL with **no bundler in the loop** — the native counterpart to Node's `node_modules` walk, and the basis of no-build and ESM-CDN workflows (and of distributed-frontend sharing, §5). The limits are the flip side of skipping the build: no tree shaking, no transform, and a deep dependency still fans out into a request waterfall — the exact problem `optimizeDeps` (§2) exists to solve.

> **Self-Test:**
> A package's file exists at `node_modules/lib/dist/secret.js`, but `import 'lib/secret'` throws [`ERR_PACKAGE_PATH_NOT_EXPORTED`](https://nodejs.org/api/packages.html#subpath-exports). Why, when the file is right there? (The package ships an `exports` map that doesn't list the `./secret` subpath. `exports` is an allowlist — unlisted subpaths are sealed off regardless of what's on disk. The fix is the package author's, not yours.)

## 2. The Dev Server: Native ESM, Transformed On Demand
The old model (webpack-era) bundled your *entire* app before serving the first byte — startup grew with codebase size. Vite inverts this: **[don't bundle in dev at all.](https://vite.dev/guide/why.html#the-origins)**

* **[Serve source over native ESM](https://vite.dev/guide/features.html#npm-dependency-resolving-and-pre-bundling):** The browser requests `/src/main.ts`; Vite transforms *that one file* (strip types, rewrite bare specifiers to real URLs) and returns it. Each `import` triggers another request. The browser's own module loader is the bundler. Startup is O(1) in app size — only what the current page imports gets touched.
* **Why pre-bundle dependencies anyway ([`optimizeDeps`](https://vite.dev/guide/dep-pre-bundling.html)):** Two problems make raw native-ESM unworkable for `node_modules`. (1) Many deps still ship **CommonJS or UMD**, which the browser can't `import` — esbuild converts them to ESM. (2) A single dep like `lodash-es` is *hundreds* of internal modules; served raw, that's hundreds of HTTP requests — a waterfall that stalls the page. esbuild **pre-bundles each dependency into one (or few) module(s)**, so `import 'lodash-es'` is one request. Vite caches the result in `node_modules/.vite` and only re-runs when your lockfile changes.
* **The asymmetry that matters:** *your* code is served unbundled (so edits are instant and granular); *dependencies* are bundled once (because they rarely change and bundling pays off). Different strategies for different change frequencies.

## 3. Why esbuild Is Fast (and Where It Stops)
esbuild does the dev transform and pre-bundle. It's 10–100× faster than JS-based toolchains — not because the algorithm is cleverer, but because of *execution-level* choices.

* **Native, parallel, single-pass:** [Written in Go](https://esbuild.github.io/faq/#why-is-esbuild-fast), compiled to native code (no JS parse/JIT warmup), and it parallelizes across all cores — bundling is embarrassingly parallel per file. Crucially it makes **as few passes over the AST as possible**, reusing one representation across parse → transform → print, where a Babel-style pipeline re-traverses the tree many times. (Go *does* have a GC; the speed isn't "no GC" — it's native code + parallelism + minimal passes + tight memory layout. See Module 11 on measuring such claims rather than trusting them.)
* **Where it stops:** esbuild deliberately omits some high-level optimizations and fine-grained chunk control. That's exactly why Vite doesn't use it for the *production* output — see §5.

## 4. HMR: Why Your Component State Survives an Edit
Hot Module Replacement is not "reload the file." A full reload would wipe all in-memory state. HMR surgically swaps one module while the app keeps running.

* **The module graph:** Vite maintains a graph of which module imports which. When you save a file, Vite finds that node and walks the import edges **upward** toward the entry, looking for an **HMR boundary**.
* **Accept boundaries ([`import.meta.hot.accept`](https://vite.dev/guide/api-hmr.html#hot-accept-cb)):** A module that calls `import.meta.hot.accept(cb)` declares "I can replace myself in place." Framework plugins inject this for you — [`@vitejs/plugin-vue`](https://github.com/vitejs/vite-plugin-vue) makes every `.vue` file self-accepting, re-rendering the component with its state preserved. Propagation stops at the first accepting module; only the path from the change up to that boundary is invalidated and re-fetched.
* **What forces a full reload:** If propagation reaches the entry with no boundary in between (e.g. you edited a module that mutates global state and nobody accepts it), Vite gives up and reloads the page. *That's* why editing a leaf component is instant but editing a shared store often reloads everything.

> **Self-Test:**
> You edit a `.vue` component and its `ref` state is preserved; you edit a plain `.ts` utility it imports and the whole page reloads. Why the difference? (The `.vue` file is an HMR *boundary* — the plugin made it self-accepting, so only it re-executes. The `.ts` util declares no `accept`, so Vite propagates the invalidation upward; finding no boundary before the entry, it falls back to a full reload.)

## 5. The Production Build: A Different Engine Entirely
In production you *do* want one optimized bundle (or a few), because HTTP request count and unused code now cost real user time. Vite hands this to **[Rollup](https://vite.dev/guide/why.html#the-origins)**, not esbuild.

* **Why Rollup for output:** Rollup produces tighter bundles with mature **code-splitting**, CSS handling, and a deep plugin ecosystem — the things esbuild intentionally keeps minimal. The cost of a slower bundler is acceptable here because the build runs once, not on every keystroke.
* **Code splitting:** Every dynamic `import()` becomes a **[split point](https://rollupjs.org/tutorial/#code-splitting)** — its own chunk, fetched on demand (route-level lazy loading is just this). Rollup also **hoists modules shared by multiple chunks** into a common chunk so they aren't duplicated, balancing request count against cache reuse.
* **Tree shaking:** Rollup drops unreferenced ESM exports, gated by the side-effect hints from Module 7 (`"sideEffects": false`, `/*#__PURE__*/`). See [Module 7](/module-7-compilers) for why ESM is statically shakeable and CommonJS is not.
* **Asset graph:** `import './styles.css'` and `import logo from './logo.png'` are treated as graph nodes too — extracted, hashed for cache-busting, and rewritten to final URLs.
* **Sharing across separately-built apps (Module Federation):** Code splitting divides *one* build; [Module Federation](https://module-federation.io/) shares code across *independently built and deployed* apps at **runtime**. A **host** loads a **remote**'s exposed modules over the network, and the two negotiate **shared singletons** — so two separately-shipped apps run *one* copy of React, not two, by agreeing on a version at load time. This is the runtime backbone of micro-frontends (Webpack's `ModuleFederationPlugin`, or Vite's native-federation built on the import maps of §1). The cost is the tradeoff Module 12 names: runtime coupling between deploys you no longer build together — a shared-dependency version skew becomes a *production* failure, not a build error. It buys org-scale team autonomy at the price of a new failure surface.

> **Self-Test:**
> Two micro-frontends built by different teams both depend on React, yet the shell loads only one copy. What mechanism made that happen, and what class of bug does it introduce that a single monolithic build never had? *(Module Federation's **shared singleton** negotiation: host and remote both declare React as `shared`, and at load time they agree on one instance instead of each bundling its own. The new failure mode is runtime version skew — ship incompatible React versions and there's no build step to catch it; hooks/context break only in production when the federated remote actually loads. Independent deploys trade build-time safety for runtime coupling.)*

## 6. The Two-Engine Consistency Tradeoff
Dev uses native ESM + esbuild; production uses Rollup. Same source, two pipelines — and they can **disagree**. A module-execution-order edge case, a CSS-injection timing difference, or a dependency that behaves differently bundled vs. unbundled can produce "works in dev, breaks in build." This is the structural weakness of the fast-dev-server approach.

The industry's answer is to **unify the engines**: **[Rolldown](https://rolldown.rs/)**, a Rust bundler from the Vite team, is being adopted (opt-in `rolldown-vite` as of this writing) to handle *both* dev pre-bundling and production output — eliminating the dev/prod gap and the cost of maintaining two code paths. It's the same throughline as Module 7: the more the toolchain shares one representation, the fewer surprises leak through. For the from-scratch version of a module graph + HMR, build the [mini bundler](/module-9-build-things) in Module 9.

> **Self-Test:**
> A feature works perfectly under `npm run dev` but throws in the `npm run build` output. Name two structural reasons this whole class of bug exists. (1) Dev serves unbundled native ESM while production runs Rollup — different module concatenation, execution order, and dead-code elimination. 2) Dependencies are esbuild-prebundled in dev but Rollup-bundled for build, so a dep relying on a specific interop or side-effect can resolve differently. The fix at the ecosystem level is a single unified bundler for both phases.)
