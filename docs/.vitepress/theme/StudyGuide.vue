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
</script>

<template>
  <details v-if="learn" class="study-guide" open>
    <summary>
      <span class="sg-label" v-html="label('compass', 13, '// how to study this module')" />
      <span class="sg-meta">
        <span class="sg-tag" v-html="label('bar-chart-3', 12, learn.level)" />
        <span class="sg-tag" v-html="label('clock', 12, duration)" />
        <span class="sg-tag" v-html="label('flask-conical', 12, learn.selfTests + ' self-tests')" />
      </span>
    </summary>

    <div class="sg-body">
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
  margin: 0 0 30px;
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid var(--silicon-prompt);
  border-radius: 0 10px 10px 0;
  background:
    linear-gradient(rgba(74, 222, 128, 0.04), rgba(74, 222, 128, 0.04)),
    var(--vp-c-bg-soft);
}
.study-guide > summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 12px 16px;
  user-select: none;
}
.study-guide > summary::-webkit-details-marker {
  display: none;
}
.sg-label {
  display: inline-flex;
  align-items: center;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--silicon-prompt);
}
.sg-meta {
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}
.sg-tag {
  display: inline-flex;
  align-items: center;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  padding: 1px 8px;
}
.sg-body {
  padding: 14px 16px 16px;
  border-top: 1px dashed var(--vp-c-divider);
  display: grid;
  gap: 14px;
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
