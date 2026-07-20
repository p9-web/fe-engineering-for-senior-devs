<script lang="ts">
// Module-scoped so render ids are unique across every diagram on a page.
let counter = 0
</script>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useData } from 'vitepress'

// `code` is encodeURIComponent'd by the markdown-it fence rule (config.mts) so the
// diagram source survives the HTML attribute + Vue template compile intact.
const props = defineProps<{ code: string }>()
const { isDark } = useData()
const source = decodeURIComponent(props.code)

const svg = ref('')
const error = ref('')

// Client-only: mermaid needs `document`, so it never runs during SSR.
async function render() {
  try {
    const { default: mermaid } = await import('mermaid')
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict', // DOMPurify-sanitized labels, no click→js — fits the security module
      theme: isDark.value ? 'dark' : 'default',
      fontFamily: 'var(--vp-font-family-mono, ui-monospace, monospace)',
    })
    // Wait for the mono webfont before rendering: mermaid sizes node boxes by
    // measuring label text, and measuring with the fallback font (while JetBrains
    // Mono is still loading) yields boxes too small for the taller webfont — the
    // last wrapped line then clips. fonts.ready guarantees measure == paint font.
    if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready
    const { svg: out } = await mermaid.render(`mermaid-${counter++}`, source)
    svg.value = out
    error.value = ''
  } catch (e) {
    svg.value = ''
    error.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(render)
watch(isDark, render) // re-theme on the site's dark/light toggle
</script>

<template>
  <div class="mermaid-figure">
    <div v-if="svg" class="mermaid-svg" v-html="svg" />
    <pre v-else-if="error" class="mermaid-error">⚠ mermaid render failed: {{ error }}

{{ source }}</pre>
    <!-- pre-hydration / fallback: show the source so the page is never blank -->
    <pre v-else class="mermaid-loading">{{ source }}</pre>
  </div>
</template>

<style scoped>
.mermaid-figure {
  margin: 24px 0;
  padding: 16px;
  display: flex;
  justify-content: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  overflow-x: auto;
}
.mermaid-svg {
  width: 100%;
  display: flex;
  justify-content: center;
}
.mermaid-svg :deep(svg) {
  max-width: 100%;
  height: auto;
}
/* Safety net against node-label clipping: never crop a hair-too-tall label,
   and keep a controlled line-height so multi-line nodes measure predictably. */
.mermaid-svg :deep(foreignObject) {
  overflow: visible;
}
.mermaid-svg :deep(.nodeLabel) {
  line-height: 1.35;
}
.mermaid-loading,
.mermaid-error {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
  word-break: break-word;
}
.mermaid-error {
  color: var(--silicon-accent, #f87171);
}
</style>
