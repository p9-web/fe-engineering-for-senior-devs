import { defineConfig } from 'vitepress'
import type { HeadConfig } from 'vitepress'
import type MarkdownIt from 'markdown-it'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Canonical production origin (GitHub Pages project site) — drives JSON-LD urls + llms.txt links.
const SITE_URL = 'https://p9-web.github.io/fe-engineering-for-senior-devs'
const SITE_TITLE = 'FE Engineering for Senior Devs'
const SITE_DESCRIPTION = 'From silicon to the screen — execution-level frontend engineering.'
const COURSE_ID = `${SITE_URL}/#course`
const DOCS_DIR = fileURLToPath(new URL('..', import.meta.url)) // docs/.vitepress -> docs/

// Modules grouped by career-value tier; numbers run in tier order — see course-syllabus.md.
const tier1 = [
  { text: '01 · JS Runtime', link: '/module-1-js-runtime' },
  { text: '02 · Browser as OS', link: '/module-2-browser-os' },
  { text: '03 · Network Bridge', link: '/module-3-network-bridge' },
]
const tier2 = [
  { text: '04 · Reactivity', link: '/module-4-reactivity' },
  { text: '05 · Data Structures', link: '/module-5-data-structures' },
  { text: '06 · Compilers & ASTs', link: '/module-6-compilers' },
  { text: '07 · Build Systems', link: '/module-7-build-systems' },
]
const tier3 = [
  { text: '08 · Build From Scratch', link: '/module-8-build-things' },
  { text: '09 · Source-Reading', link: '/module-9-source-code-judgment' },
  { text: '10 · WebAssembly', link: '/module-10-wasm' },
  { text: '11 · Browser APIs', link: '/module-11-browser-apis' },
]

// Only modules whose source page actually exists are schema'd / linked.
// (10 & 11 appear in the syllabus + nav but aren't authored yet; they auto-join once their .md lands.)
const courseModules = [...tier1, ...tier2, ...tier3].filter((m) =>
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
