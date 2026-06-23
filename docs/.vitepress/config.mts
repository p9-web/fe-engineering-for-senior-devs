import { defineConfig } from 'vitepress'
import type MarkdownIt from 'markdown-it'

// Modules are grouped by career-value tier, not by number — see course-syllabus.md.
const tier1 = [
  { text: '01 · JS Runtime', link: '/module-1-js-runtime' },
  { text: '02 · Browser as OS', link: '/module-2-browser-os' },
  { text: '08 · Network Bridge', link: '/module-8-network-bridge' },
]
const tier2 = [
  { text: '03 · Reactivity', link: '/module-3-reactivity' },
  { text: '04 · Data Structures', link: '/module-4-data-structures' },
  { text: '05 · Compilers & ASTs', link: '/module-5-compilers' },
  { text: '10 · Build Systems', link: '/module-10-build-systems' },
]
const tier3 = [
  { text: '06 · Build From Scratch', link: '/module-6-build-things' },
  { text: '11 · Browser APIs', link: '/module-11-browser-apis' },
  { text: '07 · Source-Reading', link: '/module-7-source-code-judgment' },
  { text: '09 · WebAssembly', link: '/module-9-wasm' },
]

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/fe-engineering-for-senior-devs/', // GitHub Pages project-site subpath
  title: 'FE Engineering for Senior Devs',
  description: 'From silicon to the screen — execution-level frontend engineering.',
  appearance: 'dark', // terminal theme is dark-first; toggle preserved
  vite: {
    server: { port: 5179 }, // avoid the default 5173
  },
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
      },
    ],
  ],
  markdown: {
    // tag blockquotes that open with "Self-Test" so the theme can style them as a REPL probe
    config: (md: MarkdownIt) => {
      md.core.ruler.push('self_test_blockquote', (state) => {
        const tokens = state.tokens
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].type !== 'blockquote_open') continue
          for (let j = i + 1; j < tokens.length && tokens[j].type !== 'blockquote_close'; j++) {
            if (tokens[j].type === 'inline') {
              if (/^\**\s*self-test/i.test(tokens[j].content.trimStart())) {
                tokens[i].attrJoin('class', 'self-test')
              }
              break
            }
          }
        }
      })
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Syllabus', link: '/course-syllabus' },
      { text: 'Tier 1 · Foundation', items: tier1 },
      { text: 'Tier 2 · Differentiators', items: tier2 },
      { text: 'Tier 3 · Rare Territory', items: tier3 },
    ],
    sidebar: [
      {
        text: 'Overview',
        items: [{ text: 'Course Syllabus', link: '/course-syllabus' }],
      },
      {
        text: 'Tier 1 · Non-Negotiable Foundation',
        items: tier1,
      },
      {
        text: 'Tier 2 · The Differentiators',
        items: tier2,
      },
      {
        text: 'Tier 3 · Rare-Engineer Territory',
        items: tier3,
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
    ],
  },
})
