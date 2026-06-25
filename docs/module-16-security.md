---
title: "Module 16 · Browser Security Architecture"
description: "Platform-level frontend security: the multi-process site-isolation model, why Spectre forced it, how COOP/COEP/CORP earn back SharedArrayBuffer and high-resolution timers, and how Trusted Types and CSP shut down DOM-based XSS at the sink."
learn:
  module: 16
  level: advanced
  timeRequired: PT40M
  prerequisites:
    - "the JS heap & SharedArrayBuffer (modules 1, 10)"
    - "cross-origin isolation as a Wasm-threads requirement (module 13)"
    - "HTTP headers & the request path (module 4)"
  outcomes:
    - "Explain why the browser became multi-process and what 'site isolation' isolates"
    - "Trace why a shared buffer + high-res timer reconstitutes a Spectre read gadget"
    - "Configure COOP/COEP/CORP to earn back crossOriginIsolated capabilities"
    - "Lock DOM injection sinks with Trusted Types and layer CSP as defense-in-depth"
  concepts:
    - "multi-process browser / site isolation"
    - "speculative execution & Spectre"
    - "side-channel / cache-timing attack"
    - "high-resolution timers"
    - "COOP (Cross-Origin-Opener-Policy)"
    - "COEP (Cross-Origin-Embedder-Policy)"
    - "CORP (Cross-Origin-Resource-Policy)"
    - "crossOriginIsolated"
    - "Trusted Types & DOM XSS sinks"
    - "Content-Security-Policy"
  misconceptions:
    - "XSS is solved by escaping user input (DOM-based XSS happens entirely client-side, after input is 'safe')"
    - "site isolation is about cookies (it's about separating address spaces so a Spectre read can't reach another site's data)"
    - "COOP alone enables SharedArrayBuffer (you need COOP *and* COEP — isolation requires sealing both opener and embeds)"
    - "CSP and Trusted Types are the same thing (CSP gates sources; Trusted Types gates the dangerous sink calls themselves)"
  selfTests: 3
  primarySources:
    - "Chromium site-isolation docs"
    - "web.dev cross-origin isolation guide"
    - "W3C Trusted Types specification"
    - "MDN COOP/COEP/CORP"
    - "Spectre (Kocher et al., 2018)"
  teachingApproach: "Start from the hardware attack (Spectre), show why it forced an architectural response, then derive each header and policy as a wall against a specific read primitive."
---

# Module 16: Browser Security Architecture

Most "frontend security" stops at *escape user input to prevent XSS, send a CSRF token*. That's necessary and nowhere near sufficient. The browser is a runtime that executes untrusted code from dozens of origins in one machine, on hardware that leaks across boundaries. Platform-level security is an *architecture* — a process model, a set of headers, and DOM-level policies — built to contain attacks that input sanitization can't see. This module derives that architecture from the attacks that forced it.

## 1. The Process Model: Site Isolation
Early browsers ran every tab in one process. Convenient, and catastrophic for security: a bug (or a hardware leak, §2) in one renderer could read another site's data sitting in the same address space. Modern browsers are **multi-process** — a privileged *browser* process, a *GPU* process, *network* process, and many sandboxed *renderer* processes.

**[Site Isolation](https://www.chromium.org/Home/chromium-security/site-isolation/)** is the key guarantee: each renderer process is dedicated to a single **site** (registrable domain + scheme), and cross-site documents and resources are pushed into *different* processes. Why "site," and why a whole process?

* **A process boundary is an address-space boundary.** The OS guarantees one process can't read another's memory. If `evil.com` and `bank.com` are in separate processes, even a total compromise of `evil.com`'s renderer — or a side channel that reads its *own* address space (§2) — finds no `bank.com` data to steal, because it isn't there.
* **The renderer is assumed hostile.** The sandbox model treats every renderer as potentially compromised; the browser process mediates all privileged operations (filesystem, real network) over IPC. The renderer can *ask*, never *act*.

Site Isolation looks like a cookie/SOP feature but is really a **memory-separation** feature — and the reason it became mandatory rather than nice-to-have is the next section.

## 2. Side Channels & Spectre
In 2018, **[Spectre](https://spectreattack.com/spectre.pdf)** changed the threat model permanently. It exploits **speculative execution**: to stay fast, CPUs guess the outcome of branches and execute ahead; if the guess is wrong, they roll back the *architectural* state — but micro-architectural state, chiefly the **cache**, retains traces of the speculative work.

The attack chains two facts:

1. **Speculation touches memory it shouldn't.** By mistraining the branch predictor, an attacker gets the CPU to speculatively read a secret it has no right to and use it to index into an array — leaving a secret-dependent footprint in the cache.
2. **Timing reveals the cache.** Reading an array element that's cached is measurably faster than one that isn't. By **timing** accesses (a side channel), the attacker reconstructs the secret byte by byte — without ever architecturally reading it.

The killer consequence for the web: a malicious script could, in principle, read *anything in its own renderer process's address space* — including another origin's data if the browser had co-located it. **High-resolution timers are the measuring instrument.** That's why, post-Spectre, the platform deliberately **reduced timer resolution** (`performance.now()` was coarsened and jittered) and **gated the sharp tools** — `SharedArrayBuffer` (which lets you build a nanosecond timer from a counter spun in a worker) was disabled on ordinary pages entirely.

So two things follow architecturally: separate sites into separate processes (§1, so there's nothing valuable to read), and only hand back precise timers / shared memory to pages that *prove* they've sealed themselves off (§3).

> **Self-Test:**
> Spectre never "reads" the secret with a normal load instruction — the speculative read is rolled back. So how does the attacker actually learn the value, and why does removing `SharedArrayBuffer` and coarsening `performance.now()` blunt the attack rather than fix the CPU? *(The secret leaks through the **cache side channel**: speculative execution caches a memory line chosen by the secret's value, and the attacker recovers it by **timing** which line is now fast to access. The CPU flaw remains; what the browser removes is the **measuring instrument** — a high-resolution clock. `SharedArrayBuffer` + a spinning worker is a homemade nanosecond timer, and `performance.now()` was the built-in one, so coarsening/gating both denies the precision needed to distinguish a cache hit from a miss.)*

## 3. Cross-Origin Isolation: Earning Back the Sharp Tools
Some legitimate, powerful features *need* the very capabilities Spectre made dangerous: `SharedArrayBuffer` (Wasm threads, Module 13; Atomics, Module 10), high-resolution timers, `performance.measureUserAgentSpecificMemory()` (Module 1). The platform's bargain: you may have them **only if you make your page `crossOriginIsolated`** — provably sealed so that even if a Spectre gadget runs, there's no cross-origin data co-resident to steal. You opt in with two headers:

* **`Cross-Origin-Opener-Policy: same-origin` (COOP)** — severs the `window.opener` relationship with cross-origin pages. Without it, a page you opened (or that opened you) shares a browsing context group and can hold a reference to your window; COOP puts you in your own group so cross-origin windows can't reach you.
* **`Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`) (COEP)** — declares that *every* cross-origin subresource you load must **explicitly opt in** to being embedded. No unvetted cross-origin image, script, or font can sit in your process unless it grants permission.

Only when **both** are set does the browser flip `self.crossOriginIsolated === true` and re-enable the gated APIs. The logic is symmetric: COOP seals the **opener** side (who can reach into you), COEP seals the **embedding** side (what you pull in) — together they guarantee nothing cross-origin is co-resident without consent, which is exactly the precondition that makes a Spectre read pointless.

The opt-in for *resources* you control is the matching header:

* **`Cross-Origin-Resource-Policy: same-origin | same-site | cross-origin` (CORP)** — a response header by which a resource declares who may embed it. COEP forces embedded resources to carry CORP (or pass CORS); CORP is how a resource says "yes, I consent."

```
# served on the top-level document to become cross-origin isolated:
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp

# served on a resource you want others to be allowed to embed:
Cross-Origin-Resource-Policy: cross-origin
```

```js
if (self.crossOriginIsolated) {
  const sab = new SharedArrayBuffer(1024)   // now permitted; Wasm threads (M13) viable
}
```

This is the mechanism Modules 10 and 13 referred to as "requires cross-origin isolation." It's not bureaucracy — it's the price of being trusted with a Spectre-capable primitive.

> **Self-Test:**
> A developer sets `COOP: same-origin` alone, expecting `SharedArrayBuffer` to work, and `crossOriginIsolated` stays `false`. Why is COOP necessary but not sufficient, and what specific gap does COEP close that COOP can't? *(COOP only seals the **opener/window** relationship — it stops cross-origin windows from holding a reference to yours. But your page can still **embed** arbitrary cross-origin subresources (images, scripts, fonts) that load into your process, leaving cross-origin data co-resident and re-exposing the Spectre target. COEP closes that by requiring every embedded cross-origin resource to opt in (via CORP/CORS). Isolation needs both the opener side and the embedding side sealed, so the browser only grants `crossOriginIsolated` when both headers are present.)*

## 4. Trusted Types: Killing DOM-Based XSS at the Sink
Classic XSS defense escapes input at the *source* — sanitize what the user typed, encode it on output. **DOM-based XSS** slips past that entirely: the dangerous step happens client-side, when *already-trusted-looking* data flows into a DOM **sink** like `element.innerHTML`, `script.src`, `eval`, or `iframe.srcdoc`. The string may have been built from `location.hash`, a JSON response, or template logic long after any input check.

**[Trusted Types](https://www.w3.org/TR/trusted-types/)** attacks the sink instead of chasing every source. Enabled by a CSP directive, it makes the browser **refuse plain strings at injection sinks** — they now demand a `TrustedHTML`/`TrustedScript`/`TrustedScriptURL` object that can only be minted by a policy *you* register:

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types app-sanitizer
```

```js
const policy = trustedTypes.createPolicy("app-sanitizer", {
  createHTML: (input) => DOMPurify.sanitize(input),   // the ONE place sanitization lives
})

el.innerHTML = userString              // rejected — a plain string is no longer allowed
el.innerHTML = policy.createHTML(userString)  // ok — goes through your audited sanitizer
```

The architectural win is **enforced funneling**: instead of auditing the hundreds of places a string *could* reach a sink, you guarantee at the platform level that *every* sink write passes through a small number of policies you can actually review. DOM XSS stops being "did we miss an escape somewhere?" and becomes "is our one policy correct?" — a question you can answer.

> **Self-Test:**
> Your app HTML-escapes all user input on the server, yet a `#<img src=x onerror=...>` in the URL fragment still executes because client code does `panel.innerHTML = decodeURIComponent(location.hash.slice(1))`. Why did server-side escaping not help, and how does Trusted Types stop this where another round of escaping might not? *(The payload never went through the server — it lives in the URL fragment and is injected entirely client-side, so server escaping is irrelevant; this is DOM-based XSS. Trusted Types blocks it structurally: with `require-trusted-types-for 'script'`, assigning a **plain string** to `innerHTML` throws, regardless of where the string came from. The only way to write the sink is via a registered policy, which forces the value through your sanitizer — you can't accidentally forget to escape, because the platform rejects the unsafe call itself.)*

## 5. Content-Security-Policy: Defense-in-Depth
**[CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)** is the broader allow-list layer Trusted Types plugs into. Where Trusted Types governs *the dangerous call*, CSP governs *what sources are allowed to load and execute at all*:

* **Source allowlists** — `script-src`, `style-src`, `connect-src`, etc. constrain where scripts may come from. A strict policy refuses inline `<script>` and arbitrary remote scripts.
* **Nonces and hashes** — rather than allowlisting hosts (brittle, bypassable via open CDNs), a modern **strict CSP** allows only scripts carrying a server-generated `nonce-…` (or whose hash matches), so an injected `<script>` without the nonce simply won't run.
* **What CSP does *not* catch** — it gates *loading and execution by source*, but a `script-src 'self'` policy won't stop `innerHTML`-based DOM XSS that injects markup executing within allowed bounds. That's precisely the gap Trusted Types (§4) fills. Conversely, Trusted Types won't stop a malicious script loaded from an allowlisted-but-compromised CDN; CSP narrows that. **They're complementary layers, not substitutes.**

```
Content-Security-Policy:
  script-src 'nonce-r4nd0m' 'strict-dynamic';
  object-src 'none';
  base-uri 'none';
  require-trusted-types-for 'script';
```

## 6. The Headers as a System
None of these pieces is a feature in isolation — together they're a coherent threat model, each wall matched to a specific attack primitive:

| Mechanism | Primitive it denies | Ties to |
| :--- | :--- | :--- |
| **Site Isolation** (process model) | A renderer reading another site's memory | §1, §2 |
| **Coarsened timers / gated `SharedArrayBuffer`** | The high-res clock that reads the cache side channel | §2 |
| **COOP + COEP → `crossOriginIsolated`** | Co-resident cross-origin data; re-grants sharp tools safely | §3, M10, M13 |
| **CORP** | Unconsented embedding of a resource | §3 |
| **Trusted Types** | Plain strings reaching DOM injection sinks (DOM XSS) | §4 |
| **CSP (strict, nonce-based)** | Loading/executing scripts from unapproved sources | §5 |

The throughline of Tier 4: each frontier capability — Wasm threads (M13), GPU compute (M14), edge execution (M15) — expands what runs in the page, and the security architecture is what lets the platform grant that power *without* reopening the holes that power creates. You earn `SharedArrayBuffer` by proving isolation; you earn a safe DOM by funneling every sink through a policy. Power and containment ship together.

> **Self-Test:**
> You enable a strict, nonce-based CSP and consider the page "XSS-safe." A pentester still lands a DOM-XSS via `widget.innerHTML = buildFromHash()`, using only first-party, nonce'd scripts. Why didn't CSP stop it, and which Tier-4 mechanism would have — illustrating why these are layers rather than alternatives? *(CSP governs **which scripts may load/execute by source**; the attack used your own legitimate, nonce-carrying script, which then wrote attacker-controlled markup into an `innerHTML` sink — CSP never inspects sink writes, so it allows it. **Trusted Types** (§4) would stop it: `require-trusted-types-for 'script'` makes the `innerHTML = string` assignment throw unless the value came from a registered policy. CSP secures the source dimension and Trusted Types the sink dimension; you need both because each is blind to the other's attack.)*
