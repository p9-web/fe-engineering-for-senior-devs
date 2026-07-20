<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useData } from 'vitepress'
import { icon } from '../icons'
import { useProgress } from './useProgress'

const { frontmatter } = useData()
const moduleNo = computed(
  () => (frontmatter.value.learn as { module?: number } | undefined)?.module ?? null,
)

const { isComplete, toggle, completedCount, total, hydrate } = useProgress()
onMounted(hydrate)

const done = computed(() => moduleNo.value != null && isComplete(moduleNo.value))
const count = computed(() => completedCount())
const pct = computed(() => Math.round((count.value / total) * 100))
const checkIcon = icon('check', 13)
</script>

<template>
  <ClientOnly>
    <div v-if="moduleNo != null" class="progress-toggle">
      <button
        type="button"
        class="pt-check"
        :class="{ 'is-done': done }"
        :aria-pressed="done"
        @click="toggle(moduleNo)"
      >
        <span class="pt-box"><span v-if="done" class="pt-tick" v-html="checkIcon" /></span>
        {{ done ? 'Completed' : 'Mark complete' }}
      </button>

      <div class="pt-meter" :aria-label="`${count} of ${total} modules complete`">
        <span class="pt-count">{{ count }} / {{ total }}</span>
        <span class="pt-track"><span class="pt-fill" :style="{ width: pct + '%' }" /></span>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.progress-toggle {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin: 64px 0 48px;
}
.pt-check {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-2);
  transition: color 0.15s ease;
}
.pt-check:hover {
  color: var(--vp-c-text-1);
}
.pt-check.is-done {
  color: var(--silicon-prompt);
}
.pt-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--vp-c-text-3);
  border-radius: 5px;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.pt-check:hover .pt-box {
  border-color: var(--silicon-prompt);
}
.pt-check.is-done .pt-box {
  background: var(--silicon-prompt);
  border-color: var(--silicon-prompt);
  color: var(--vp-c-bg);
}
.pt-tick {
  display: inline-flex;
}
/* the global .lic icon class adds margin-right (for icon-then-text); zero it so
   the standalone check sits centered in the box */
.pt-box :deep(.lic) {
  margin: 0;
  vertical-align: 0;
}
.pt-meter {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.pt-track {
  display: inline-block;
  width: 120px;
  height: 4px;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}
.pt-fill {
  display: block;
  height: 100%;
  background: var(--silicon-prompt);
  transition: width 0.3s ease;
}
</style>
