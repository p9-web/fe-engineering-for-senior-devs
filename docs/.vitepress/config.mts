import { defineConfig } from 'vitepress'
import type { HeadConfig } from 'vitepress'
import type MarkdownIt from 'markdown-it'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { icon } from './icons'

// Canonical production origin (GitHub Pages project site) — drives JSON-LD urls + llms.txt links.
const SITE_URL = 'https://p9-web.github.io/fe-engineering-for-senior-devs'
const SITE_TITLE = 'FE Engineering for Senior Devs'
const SITE_DESCRIPTION = 'From silicon to the screen — execution-level frontend engineering.'
const COURSE_ID = `${SITE_URL}/#course`
const DOCS_DIR = fileURLToPath(new URL('..', import.meta.url)) // docs/.vitepress -> docs/

// Modules grouped by career-value tier; numbers run in tier order — see course-syllabus.md.
// `icon` is a Lucide name (see ./icons) projected into nav/sidebar display text via withIcons().
const tier1 = [
  { text: '01 · JS Runtime', link: '/module-1-js-runtime', icon: 'cpu' },
  { text: '02 · Browser as OS', link: '/module-2-browser-os', icon: 'app-window' },
  { text: '03 · Performance Engineering', link: '/module-3-performance-engineering', icon: 'gauge' },
  { text: '04 · Network Bridge', link: '/module-4-network-bridge', icon: 'network' },
]
const tier2 = [
  { text: '05 · Reactivity', link: '/module-5-reactivity', icon: 'zap' },
  { text: '06 · Data Structures', link: '/module-6-data-structures', icon: 'binary' },
  { text: '07 · Compilers & ASTs', link: '/module-7-compilers', icon: 'braces' },
  { text: '08 · Build Systems', link: '/module-8-build-systems', icon: 'package' },
]
const tier3 = [
  { text: '09 · Build From Scratch', link: '/module-9-build-things', icon: 'hammer' },
  { text: '10 · Browser APIs', link: '/module-10-browser-apis', icon: 'puzzle' },
  { text: '11 · Source-Reading', link: '/module-11-source-code-judgment', icon: 'glasses' },
  { text: '12 · Systems Design', link: '/module-12-systems-design', icon: 'workflow' },
]
const tier4 = [
  { text: '13 · WebAssembly', link: '/module-13-webassembly', icon: 'box' },
  { text: '14 · WebGPU & Compute', link: '/module-14-webgpu', icon: 'grid-3x3' },
  { text: '15 · Edge & Streaming', link: '/module-15-edge-streaming', icon: 'globe' },
  { text: '16 · Browser Security', link: '/module-16-security', icon: 'shield' },
]

// Project the Lucide icon into the menu label (nav/sidebar render `text` via v-html).
// Used for display ONLY — schema/llms.txt read the base arrays above so no SVG leaks into metadata.
type Module = { text: string; link: string; icon: string }
const withIcons = (mods: Module[]) =>
  mods.map((m) => ({ text: icon(m.icon, 16) + m.text, link: m.link }))

// Only modules whose source page actually exists are schema'd / linked
// (the fs.existsSync filter lets a module auto-join nav/schema once its .md lands).
const courseModules = [...tier1, ...tier2, ...tier3, ...tier4].filter((m) =>
  fs.existsSync(path.join(DOCS_DIR, `${m.link.replace(/^\//, '')}.md`)),
)

// Shape authored in each module page's `learn:` frontmatter block — the single source of truth
// projected into machine metadata (this file) and the on-page StudyGuide (theme/StudyGuide.vue).
type Learn = {
  module: number
  level: string
  timeRequired: string // ISO-8601 duration, e.g. PT45M
  prerequisites: string[]
  outcomes: string[]
  concepts: string[]
  misconceptions: string[]
  selfTests: number
  primarySources?: string[]
  teachingApproach: string
}

// Collected per page during transformPageData, consumed in buildEnd to emit llms.txt.
type CollectedPage = {
  module: number
  title: string
  url: string
  description: string
  teaches: string[]
  relativePath: string
}
const learnPages: CollectedPage[] = []

const absUrl = (relativePath: string) =>
  relativePath === 'index.md'
    ? `${SITE_URL}/`
    : `${SITE_URL}/${relativePath.replace(/\.md$/, '.html')}`

// schema.org Course tying the modules together as one curriculum — emitted on home + syllabus.
function courseLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': COURSE_ID,
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/`,
    inLanguage: 'en',
    provider: { '@type': 'Organization', name: SITE_TITLE, url: `${SITE_URL}/` },
    hasPart: courseModules.map((m) => ({
      '@type': 'LearningResource',
      name: m.text.replace(/^\d+\s*·\s*/, ''),
      url: `${SITE_URL}${m.link}.html`,
    })),
  }
}

// schema.org LearningResource for one module — the deep, per-page learning hints for crawlers.
function learningResourceLd(title: string, description: string, url: string, learn: Learn) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    '@id': `${url}#learn`,
    name: title,
    description,
    url,
    inLanguage: 'en',
    learningResourceType: 'course module',
    educationalLevel: learn.level,
    timeRequired: learn.timeRequired,
    teaches: learn.concepts,
    competencyRequired: learn.prerequisites,
    assesses: learn.outcomes,
    isPartOf: { '@type': 'Course', '@id': COURSE_ID, name: SITE_TITLE, url: `${SITE_URL}/` },
    ...(learn.primarySources?.length ? { citation: learn.primarySources } : {}),
  }
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/fe-engineering-for-senior-devs/', // GitHub Pages project-site subpath
  srcExclude: ['archive/**'], // archived modules (e.g. WebAssembly): kept in repo + git history, not built or listed
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
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
  // Project authored learning-design frontmatter into per-page crawler metadata.
  transformPageData(pageData) {
    const rel = pageData.relativePath
    const fm = pageData.frontmatter
    const head: HeadConfig[] = (fm.head ??= [])
    const title = (fm.title as string) || pageData.title || SITE_TITLE
    const description = (fm.description as string) || SITE_DESCRIPTION

    // Home + syllabus carry the Course schema that binds the modules into one path.
    if (rel === 'index.md' || rel === 'course-syllabus.md') {
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify(courseLd())])
      return
    }

    const learn = fm.learn as Learn | undefined
    if (!learn) return

    const url = absUrl(rel)
    head.push([
      'script',
      { type: 'application/ld+json' },
      JSON.stringify(learningResourceLd(title, description, url, learn)),
    ])
    head.push(['meta', { name: 'ai:teaches', content: learn.concepts.join(', ') }])
    head.push(['meta', { name: 'ai:prerequisites', content: learn.prerequisites.join(', ') }])
    head.push(['meta', { name: 'ai:misconceptions', content: learn.misconceptions.join(' | ') }])
    head.push(['meta', { name: 'ai:how-to-teach', content: learn.teachingApproach }])

    // Collect for llms.txt; dedupe by module since dev HMR re-runs this hook.
    if (!learnPages.some((p) => p.module === learn.module)) {
      learnPages.push({ module: learn.module, title, url, description, teaches: learn.concepts, relativePath: rel })
    }
  },
  // Emit llms.txt (curated map) + llms-full.txt (all module markdown) for AI assistants. Build only.
  buildEnd(siteConfig) {
    if (!learnPages.length) return
    const sorted = [...learnPages].sort((a, b) => a.module - b.module)

    const index = [
      `# ${SITE_TITLE}`,
      '',
      `> ${SITE_DESCRIPTION}`,
      '',
      'Execution-level frontend engineering for senior developers. Each module explains how code actually runs — the mechanism, the memory, the cost — a layer below where most mental models stop.',
      '',
      '## Modules',
      '',
      ...sorted.map((p) => `- [${p.title}](${p.url}): ${p.description} Teaches: ${p.teaches.join(', ')}.`),
      '',
      '## Optional',
      '',
      `- [Course syllabus](${SITE_URL}/course-syllabus.html): the full curriculum, organized by leverage tier.`,
      `- [Full text, all modules inlined](${SITE_URL}/llms-full.txt): for one-shot ingestion.`,
      '',
    ].join('\n')
    fs.writeFileSync(path.join(siteConfig.outDir, 'llms.txt'), index)

    const full = [`# ${SITE_TITLE}`, '', `> ${SITE_DESCRIPTION}`, '']
    for (const p of sorted) {
      const md = fs.readFileSync(path.join(DOCS_DIR, p.relativePath), 'utf-8')
      full.push('', '---', '', `<!-- SOURCE: ${p.url} -->`, '', md)
    }
    fs.writeFileSync(path.join(siteConfig.outDir, 'llms-full.txt'), full.join('\n'))
  },
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

      // Render ```mermaid fences as the client-side <Mermaid> component (see theme/Mermaid.vue).
      // Source is encodeURIComponent'd so it survives the HTML attribute + Vue template compile.
      const defaultFence =
        md.renderer.rules.fence ??
        ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        if (tokens[idx].info.trim().toLowerCase() === 'mermaid') {
          return `<Mermaid code="${encodeURIComponent(tokens[idx].content)}"></Mermaid>`
        }
        return defaultFence(tokens, idx, options, env, self)
      }
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: icon('home', 15) + 'Home', link: '/' },
      { text: icon('list', 15) + 'Syllabus', link: '/course-syllabus' },
      { text: 'Tier 1 · Foundation', items: withIcons(tier1) },
      { text: 'Tier 2 · Differentiators', items: withIcons(tier2) },
      { text: 'Tier 3 · Rare Territory', items: withIcons(tier3) },
      { text: 'Tier 4 · Frontier', items: withIcons(tier4) },
    ],
    sidebar: [
      {
        text: 'Overview',
        items: [{ text: icon('compass', 16) + 'Course Syllabus', link: '/course-syllabus' }],
      },
      {
        text: 'Tier 1 · Non-Negotiable Foundation',
        items: withIcons(tier1),
      },
      {
        text: 'Tier 2 · The Differentiators',
        items: withIcons(tier2),
      },
      {
        text: 'Tier 3 · Rare-Engineer Territory',
        items: withIcons(tier3),
      },
      {
        text: 'Tier 4 · The Platform Frontier',
        items: withIcons(tier4),
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
    ],
  },
})
