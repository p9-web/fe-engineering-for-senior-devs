---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
description: "Execution-level frontend engineering for senior devs — how code runs from silicon to the screen: the event loop, the pixel pipeline, performance, reactivity, compilers, and systems design."

hero:
  name: "From Silicon to the Screen"
  text: "FE Engineering for Senior Devs"
  tagline: How code actually runs — the mechanism, the memory, the cost. A layer below where most mental models stop.
  actions:
    - theme: brand
      text: Start · Module 1
      link: /module-1-js-runtime
    - theme: alt
      text: Course Syllabus
      link: /course-syllabus

features:
  - title: Tier 1 · Non-Negotiable Foundation
    icon: '<svg class="feat-ico" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20v2"/><path d="M12 2v2"/><path d="M17 20v2"/><path d="M17 2v2"/><path d="M2 12h2"/><path d="M2 17h2"/><path d="M2 7h2"/><path d="M20 12h2"/><path d="M20 17h2"/><path d="M20 7h2"/><path d="M7 20v2"/><path d="M7 2v2"/><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>'
    details: The JS runtime (event loop, V8 hidden classes, memory), the browser as an OS (layout vs. paint vs. composite, the 16.67ms budget), performance profiling, and the network bridge. The bedrock every senior is assumed to have.
    link: /module-1-js-runtime
    linkText: Start the foundation
  - title: Tier 2 · The Differentiators
    icon: '<svg class="feat-ico" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>'
    details: Reactivity engines read from the source, the data structures underneath them, compilers and ASTs, and the build systems that turn thousands of files into executable code. Where most senior devs never go.
    link: /module-5-reactivity
    linkText: Go deeper
  - title: Tier 3 · Rare-Engineer Territory
    icon: '<svg class="feat-ico" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/></svg>'
    details: Build a reactive engine and a virtual scroller from scratch, wield the platform APIs that get work off the main thread, read the masters, and design systems that stay manageable as they grow.
    link: /module-9-build-things
    linkText: Build the hard things
---

<CourseProgress />
