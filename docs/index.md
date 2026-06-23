---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

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
  - title: Runtime internals
    details: The event loop's exact scheduling, the microtask/macrotask split, V8 hidden classes and inline caching, and where memory actually lives.
  - title: The browser as an OS
    details: DOM/CSSOM construction, layout vs. paint vs. composite, the 16.67ms frame budget, and why layout thrashing is so expensive.
  - title: Reactivity, decoded
    details: track/trigger and dependency maps, fine-grained signals, virtual-DOM diffing, and compiler-driven reactivity — read from the source.
---
