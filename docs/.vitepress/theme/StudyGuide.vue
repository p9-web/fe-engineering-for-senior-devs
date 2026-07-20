<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { icon } from '../icons'

// icon + heading as one v-html string. Calling a function (vs an inline `icon() + text`
// concat) also sidesteps esbuild's bogus "?? always returns the left operand" warning on
// the markup Vue generates for v-html.
const label = (name: string, size: number, text: string = '') => icon(name, size) + text

// Mirrors the `learn:` frontmatter block (see .vitepress/config.mts). Renders only when present.
type Learn = {
  level: string
  timeRequired: string
  prerequisites: string[]
  outcomes: string[]
  misconceptions: string[]
  selfTests: number
  primarySources?: string[]
  recall?: string[] // retrieval prompts answered from memory before reading (spacing/interleaving)
}

const { frontmatter } = useData()
const learn = computed(() => frontmatter.value.learn as Learn | undefined)

// ISO-8601 duration -> human label: PT1H30M -> "~1 h 30 min", PT45M -> "~45 min"
function fmtDuration(iso: string): string {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || '')
  if (!m) return iso
  const parts: string[] = []
  if (m[1]) parts.push(`${m[1]} h`)
  if (m[2]) parts.push(`${m[2]} min`)
  return parts.length ? `~${parts.join(' ')}` : iso
}
const duration = computed(() => (learn.value ? fmtDuration(learn.value.timeRequired) : ''))
const chevron = icon('chevron-down', 15)
</script>

<template>
  <!-- Collapsed by default: a slim one-line meta strip that sits above the title
       without burying the content. Expands to the full study scaffold on click. -->
  <details v-if="learn" class="study-guide">
    <summary>
      <span class="sg-label" v-html="label('compass', 14, 'How to study this module')" />
      <span class="sg-meta">{{ learn.level }} · {{ duration }} · {{ learn.selfTests }} self-tests</span>
      <span class="sg-chevron" v-html="chevron" />
    </summary>

    <div class="sg-body">
      <section v-if="learn.recall?.length" class="sg-section sg-recall">
        <h4 v-html="label('rotate-ccw', 13, 'Recall first — from earlier modules')" />
        <ul class="sg-list">
          <li v-for="r in learn.recall" :key="r">{{ r }}</li>
        </ul>
      </section>

      <section v-if="learn.prerequisites?.length" class="sg-section">
        <h4 v-html="label('book-marked', 13, 'Assumed knowledge')" />
        <ul class="sg-chips">
          <li v-for="p in learn.prerequisites" :key="p">{{ p }}</li>
        </ul>
      </section>

      <section v-if="learn.outcomes?.length" class="sg-section">
        <h4 v-html="label('target', 13, `You'll be able to`)" />
        <ul class="sg-list">
          <li v-for="o in learn.outcomes" :key="o">{{ o }}</li>
        </ul>
      </section>

      <section v-if="learn.misconceptions?.length" class="sg-section sg-warn">
        <h4 v-html="label('triangle-alert', 13, 'Watch out — common wrong models')" />
        <ul class="sg-list">
          <li v-for="m in learn.misconceptions" :key="m">{{ m }}</li>
        </ul>
      </section>

      <section v-if="learn.primarySources?.length" class="sg-section">
        <h4 v-html="label('book-open', 13, 'Grounded in source')" />
        <ul class="sg-chips">
          <li v-for="s in learn.primarySources" :key="s">{{ s }}</li>
        </ul>
      </section>
    </div>
  </details>
</template>

<style scoped>
.study-guide {
  margin: 0 0 26px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
/* slim: the collapsed strip is a single ~36px row, not a full panel */
.study-guide > summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  user-select: none;
}
.study-guide > summary::-webkit-details-marker {
  display: none;
}
.study-guide[open] > summary {
  border-bottom: 1px solid var(--vp-c-divider);
}
.sg-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-1);
}
/* accent only the leading glyph, so the strip stays quiet */
.sg-label :deep(.lic) {
  color: var(--silicon-prompt);
}
.sg-meta {
  margin-left: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
.sg-chevron {
  display: inline-flex;
  color: var(--vp-c-text-3);
  transition: transform 0.2s ease;
}
.study-guide[open] .sg-chevron {
  transform: rotate(180deg);
}
.sg-body {
  padding: 16px;
  display: grid;
  gap: 16px;
}
.sg-section h4 {
  display: flex;
  align-items: center;
  margin: 0 0 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}
.sg-warn h4 {
  color: var(--silicon-accent);
}
.sg-recall h4 {
  color: var(--silicon-prompt);
}
.sg-recall .sg-list {
  list-style: none;
  padding-left: 0;
}
.sg-recall .sg-list li::before {
  content: '↻ ';
  color: var(--silicon-prompt);
}
.sg-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
}
.sg-list li {
  color: var(--vp-c-text-2);
}
.sg-warn .sg-list {
  list-style: none;
  padding-left: 0;
}
.sg-warn .sg-list li::before {
  content: '⚠ ';
  color: var(--silicon-accent);
}
.sg-chips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sg-chips li {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  padding: 2px 8px;
}
</style>
