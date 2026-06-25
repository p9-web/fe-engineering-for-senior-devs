---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
description: "Execution-level frontend engineering for senior devs — how code runs from silicon to the screen: the event loop, the pixel pipeline, reactivity, compilers, the network, and WebAssembly."

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
    details: The JS runtime (event loop, V8 hidden classes, memory), the browser as an OS (layout vs. paint vs. composite, the 16.67ms budget), and the network bridge. The bedrock every senior is assumed to have.
    link: /module-1-js-runtime
    linkText: Start the foundation
  - title: Tier 2 · The Differentiators
    details: Reactivity engines read from the source, the data structures underneath them, compilers and ASTs, and the build systems that turn thousands of files into executable code. Where most senior devs never go.
    link: /module-4-reactivity
    linkText: Go deeper
  - title: Tier 3 · Rare-Engineer Territory
    details: Build a reactive engine and a virtual scroller from scratch, wield the platform APIs that get work off the main thread, read the masters, and push past JavaScript into WebAssembly.
    link: /module-8-build-things
    linkText: Build the hard things
---
