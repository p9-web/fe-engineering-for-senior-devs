---
title: "Module 12 · Systems Design & Complexity Management"
description: "The orthogonal axis to execution: coupling vs cohesion, abstraction boundaries, API design, state propagation, cache invalidation, concurrency reasoning, tradeoff judgment, and the economics of change."
learn:
  module: 12
  level: advanced
  timeRequired: PT55M
  prerequisites:
    - "the execution mechanisms from modules 1–11"
    - "source reading & technical judgment (module 11)"
    - "having shipped and maintained a non-trivial system"
  outcomes:
    - "Name the coupling in a change that ripples across modules, and propose the boundary that contains it"
    - "Treat cache invalidation as a correctness problem, not a performance tweak"
    - "Defend an architecture tradeoff in writing (an ADR) instead of by assertion"
    - "Explain in economic terms why change gets more expensive over time, and name the strategic investment that bends the curve"
  concepts:
    - "coupling vs cohesion & change amplification"
    - "abstraction boundaries & leaky abstractions"
    - "information hiding (Parnas: modularize around what changes)"
    - "API design for the caller & Hyrum's Law"
    - "state-propagation complexity (single source of truth, derived state)"
    - "cache invalidation as a correctness problem"
    - "concurrency reasoning: invariants across await/yield points"
    - "tradeoff analysis, ADRs/RFCs, one-way vs two-way doors"
    - "maintainability economics: tactical vs strategic programming, cost of change"
    - "complexity is incremental (change amplification, cognitive load, unknown unknowns)"
  misconceptions:
    - "more abstraction is better design (the wrong boundary couples more than none)"
    - "DRY always wins (deduplicating incidental similarity creates coupling)"
    - "you can design the system correctly up front (you design for change, not prediction)"
    - "working code is the deliverable (the changeable codebase is the asset; all debt is bad — only silent, accidental debt compounds)"
  selfTests: 5
  primarySources:
    - "Parnas, 'On the Criteria To Be Used in Decomposing Systems into Modules'"
    - "Hyrum's Law"
    - "real ADRs and Vue/React/Rust RFCs"
    - "Ousterhout, 'A Philosophy of Software Design'"
  teachingApproach: "Treat complexity as the real cost; for each principle, show the failure it prevents three years out."
  recall:
    - "From memory: how do Module 5's `track` and `trigger` propagate a state change to its dependents, and why does that make storing a derived value as its own source of truth a liability?"
    - "Before reading: at an `await`, what does Module 1's event loop actually do, and what can mutate shared state before the next statement runs?"
    - "From memory: which Module 4 HTTP-cache mechanism makes stale data unreachable instead of invalidating it, and what changes about the key when the content changes?"
---

# Module 12: Systems Design & Complexity Management

Every other module in this curriculum answers one question: *how does this execute?* This one answers a different, orthogonal question: **how do you keep a system changeable as it grows?** That distinction is the whole point. A senior engineer is not paid for knowing APIs — AI knows the APIs. They're paid for the judgment that keeps a codebase cheap to change after three years and five people have touched it. The enemy is not slowness; it's **complexity** — the thing that makes every future change expensive. This module is about minimizing it deliberately.

## 1. Coupling vs Cohesion — the Master Variable
Almost every design principle is a special case of this one.

* **Coupling** is how much one part must know about another. **Cohesion** is how much a part's own pieces belong together. You want low coupling, high cohesion.
* The real cost of coupling is **change amplification**: one logical change forces edits in N places. When a one-line product change touches seven files, the design — not the change — is wrong. Coupling is the multiplier on the cost of every future change — the quantity §8 turns into an economic argument.
* **Misconception — "DRY always wins."** Deduplicating code that is *incidentally* identical couples two things that will later need to change for different reasons. The shared helper that served the checkout page and the admin page becomes a knot the day they diverge. Prefer the **Rule of Three**, and remember: a little duplication is far cheaper than the wrong abstraction.

<SelfTest>

A trivial product change ("admins see prices including tax") forces edits in seven files across three features. Name what's wrong and the shape of the fix.

<template #answer>

High coupling / low cohesion: tax logic is duplicated or leaked across features instead of owned by one cohesive module. The fix is a boundary — a single pricing module the others call — so the rule lives in one place and the next change touches one file, not seven.

</template>
</SelfTest>

## 2. Abstraction Boundaries (and Why They Leak)
An abstraction is a promise: *you don't need to know what's behind this line.* A good boundary earns that promise; a bad one charges you the cost of indirection and still makes you look behind it.

* **Information hiding ([Parnas](https://dl.acm.org/doi/10.1145/361598.361623)):** decompose a system around the **decisions most likely to change**, not around the *steps* of a process. Hide the volatile thing — the storage format, the third-party API, the wire protocol — behind the seam, so changing it doesn't ripple.
* **Leaky abstractions:** the ORM that runs fine until you must hand-tune the SQL it generates; the "simple" cache that forces you to reason about eviction. The test of a boundary is blunt: **can you change the implementation without changing the callers?** If not, the abstraction leaks.
* **Misconception — "more abstraction is better."** The wrong boundary is worse than none: you pay the indirection tax *and* still leak. Don't abstract until you can name the axis of change you're hiding.

## 3. API Design Is for the Caller
An API's quality is measured at the call site, not in its implementation.

* Design the signature you'd *want to call*, then make the implementation satisfy it. Aim for a **pit of success**: the easy way to use it is the correct way.
* **[Hyrum's Law](https://www.hyrumslaw.com/):** with enough consumers, every observable behavior of your system — not just the documented contract — becomes something someone depends on. Your real API surface is *everything you expose*, including the accidents. That's why narrowing the surface (fewer public methods, opaque return types) is a design act.
* Breaking changes are a complexity event: prefer **additive** changes, provide deprecation paths, and write down the migration. This is exactly the discipline you watched maintainers exercise in [Module 11](/module-11-source-code-judgment) when you read a real RFC.

## 4. State-Propagation Complexity (ties Module 5)
[Module 5](/module-5-reactivity) showed the *machinery* of propagating state — `track`/`trigger`, signals, the scheduler. The architecture question is different: **where does state live, and who is allowed to derive from it?**

* **Single source of truth.** The most common large-app bug isn't a wrong algorithm; it's the *same fact stored in two places* that drift apart. Derived state should be **computed**, not stored — the moment you cache a derivation as its own state, you own an invalidation problem (§5).
* The diamond/glitch problem from Module 5 reappears here as an *architecture* smell: if updating one value can transiently leave the UI inconsistent, your state graph has a propagation-order dependency you haven't made explicit.

## 5. Cache Invalidation Is a Correctness Problem (ties Module 4)
The old joke names two hard problems; this is the second. [Module 4](/module-4-network-bridge) covered HTTP cache layers — here's the general principle: **any** cache (a memoized selector, a store, a CDN, a `Map` you added last week) trades freshness for speed, and staleness is a *correctness bug in waiting*, not a perf detail.

* The strategies are few: **TTL** (accept bounded staleness), **write-through / event-based invalidation** (push updates on change), and **invalidation by identity** — content-hashing, where the key changes when the content does so stale data is simply unreachable. That last one (Module 4's `immutable` + hashed filenames) is powerful precisely because it *sidesteps* invalidation instead of solving it.
* Decide the staleness budget *explicitly*. "It's cached" without an answer to "for how long, and what makes it wrong?" is a bug you haven't hit yet.

<SelfTest>

A memoized selector returns a user's order total. After a mutation adds an item, the UI still shows the old total until a full reload. Classify the bug and give the principled fix.

<template #answer>

It's cache invalidation, not a render bug: the memo cached a *derivation* of state and nothing invalidated it on write. Principled fix — derive the total reactively from the source list so it can never be stale, or key/invalidate the memo on the exact inputs that changed. Storing derived state is the root cause.

</template>
</SelfTest>

## 6. Concurrency: Reason About Interleavings (ties Modules 1 & 10)
JavaScript is single-threaded ([Module 1](/module-1-js-runtime)), but that does **not** make it race-free. Every [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) is a yield point where other code runs and shared state can change underneath you.

* The discipline: **state your invariant, then check it holds at every `await`/`yield` point.** Two async functions that read-modify-write the same store, a response that arrives out of order, a stale closure capturing old state — these are races without a second thread.

```js
// Race: two rapid calls interleave at the await; the second read sees stale `count`.
async function increment() {
  const v = await store.get('count') // yield — another increment can run here
  await store.set('count', v + 1)     // lost update
}
```

* When you *do* add real parallelism — [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) and [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)/[`Atomics`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics) from [Module 10](/module-10-browser-apis) — the same invariant discipline scales up, except now the races are simultaneous and `Atomics` is your only safe read-modify-write.

<SelfTest variant="run">

Single-threaded JavaScript, no workers. Predict what `count` logs after three concurrent increments, then run it in the console:

```js
let count = 0
const store = {
  async get() { await new Promise((r) => setTimeout(r)); return count },
  async set(v) { await new Promise((r) => setTimeout(r)); count = v },
}
async function increment() {
  const v = await store.get() // yield point
  await store.set(v + 1)
}
await Promise.all([increment(), increment(), increment()])
console.log(count)
```

<template #answer>

`1`, not `3`. All three `increment`s reach `await store.get()` and suspend before any `set` runs, so each reads `count === 0`; then each writes `1`. Two updates are lost. No second thread is involved — every `await` is a yield point where the other calls interleave, which is precisely the invariant-across-await discipline of §6. The fix is to make read-modify-write atomic: serialize through one owner, or hold the value in a single source of truth instead of round-tripping it through a racy get/set.

</template>
</SelfTest>

## 7. Judgment: Put the Tradeoff in Writing (ties Module 11)
The capstone skill, and the one that compounds: being the engineer who can say *"this architecture will fail in eighteen months because the state-propagation complexity is wrong"* — and be right.

* Write **ADRs / RFCs**. Forcing a decision into prose — the context, the alternatives considered, the tradeoff accepted — is what separates a defensible choice from an assertion. It's also how you earn the right to disagree with a more senior engineer: with a written tradeoff, not a louder opinion.
* Distinguish **[one-way doors from two-way doors](https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders)** (Bezos): a reversible decision deserves a fast, cheap call; an irreversible one (a public API shape, a data model, a framework) deserves the ADR. Spend your judgment where it's expensive to undo.
* This is the natural successor to [Module 11](/module-11-source-code-judgment): you've learned to read and judge the systems others built; now you design your own so the next reader's judgment is kind.

<SelfTest>

You're choosing between a shared global store and prop-drilling for a new feature, and the team wants a decision in the standup. What makes this an ADR-worthy moment, and what must the ADR contain to be worth writing?

<template #answer>

It shapes state ownership — closer to a one-way door than a two-way one, since unwinding a global store later is expensive. A worthwhile ADR states the context and constraints, the alternatives with their coupling/complexity tradeoffs, the decision, and the conditions under which you'd revisit it — so the choice is defensible and the next engineer inherits the *reasoning*, not just the result.

</template>
</SelfTest>

## 8. The Economics of Change — Why Any of This Pays
Every principle above is an *investment*, and this section is the model that says when it's worth making. Without it, "good design" sounds like taste; with it, you can defend the boundary you drew in a standup with a number, not an adjective.

* **Complexity is incremental** (Ousterhout). No single shortcut wrecks a codebase — each "I'll just special-case this here" feels free at the call site. The cost is the *sum*: a thousand free-feeling decisions become the system no one dares change. This is why you can't fix it later in one pass; it didn't arrive in one pass.
* **The cost of a change ≈ how many modules you must understand and touch to make it safely.** That product is what §1's coupling actually prices — coupling is the *multiplier* on every future change, which is why it's the master variable. A change that is "two lines, but you must hold six modules in your head to be sure it's safe" is an expensive change wearing a cheap diff.
* **Tactical vs strategic programming** (Ousterhout). *Tactical*: make the feature work, complexity be damned. *Strategic*: spend a standing ~10–20% keeping the design clean — extracting the boundary, deleting the special case. The strategic tax feels like it slows you down; it's the only thing that keeps you fast, because it's the only payment that earns *compounding* interest. Pure tactical programming is borrowing against a loan whose statement never arrives.
* **Not all debt is bad — silent debt is.** A *deliberate, written* tradeoff (the two-way door of §7) is a loan you took with eyes open and can repay on schedule. *Accidental, undocumented* debt — the coupling no one named, the cache with no staleness budget (§5) — compounds in the dark until the interest exceeds the principal.

The deliverable was never the code that runs today; AI can produce that on demand. The asset is a codebase that stays *cheap to change* — and complexity is just the name for everything that raises that price.

<SelfTest>

A feature that took two days in year one takes two weeks in year three, on the same team. The code isn't slower and the engineers aren't worse — what got expensive, in this module's terms, and what earlier investment would have bent the curve?

<template #answer>

Nothing about the *feature* changed; the **cost of change** rose. The slowdown is accrued complexity surfacing as change amplification (§1), cognitive load — more you must hold in your head before a change is safe — and unknown unknowns: you can't tell what a change will break. It compounded because each tactical shortcut raised the baseline for the next. The curve bends with strategic investment paid *continuously* — boundaries around what changes (§2), one source of truth so facts don't drift (§4) — not a year-three "big refactor," which is just repaying the whole loan at once, with penalties.

</template>
</SelfTest>
