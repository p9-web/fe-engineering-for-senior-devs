<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useProgress } from './useProgress'

const { completedCount, total, reset, hydrate } = useProgress()
onMounted(hydrate)

const count = computed(() => completedCount())
const pct = computed(() => Math.round((count.value / total) * 100))
const confirming = ref(false)

function doReset() {
  reset()
  confirming.value = false
}
</script>

<template>
  <ClientOnly>
    <!-- only surfaces once the reader has completed at least one module -->
    <section v-if="count > 0" class="course-progress">
      <div class="cp-head">
        <span class="cp-label">Your progress</span>
        <span class="cp-count"><strong>{{ count }}</strong> / {{ total }}</span>
      </div>
      <div class="cp-track"><span class="cp-fill" :style="{ width: pct + '%' }" /></div>
      <div class="cp-foot">
        <span>{{ pct }}% complete · saved in this browser</span>
        <button v-if="!confirming" type="button" class="cp-reset" @click="confirming = true">
          Reset
        </button>
        <span v-else class="cp-confirm">
          Reset all progress?
          <button type="button" class="cp-yes" @click="doReset">Yes</button>
          <button type="button" class="cp-no" @click="confirming = false">Cancel</button>
        </span>
      </div>
    </section>
  </ClientOnly>
</template>

<style scoped>
.course-progress {
  max-width: 688px;
  margin: 80px auto 72px;
  padding: 0 24px;
}
.cp-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.cp-label {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}
.cp-count {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-3);
}
.cp-count strong {
  font-size: 17px;
  color: var(--vp-c-text-1);
}
.cp-track {
  height: 6px;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
}
.cp-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--vp-c-brand-1), var(--silicon-accent));
  transition: width 0.4s ease;
}
.cp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 9px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-3);
}
.cp-reset,
.cp-yes,
.cp-no {
  background: none;
  border: none;
  padding: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--vp-c-text-3);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.cp-reset:hover,
.cp-no:hover,
.cp-yes:hover {
  color: var(--vp-c-text-1);
}
.cp-confirm {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--vp-c-text-2);
}
.cp-yes {
  color: var(--silicon-accent);
}
</style>
