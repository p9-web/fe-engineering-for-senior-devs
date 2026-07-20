<script setup lang="ts">
import { ref, computed } from 'vue'
import { icon } from '../icons'

// A predict -> commit -> reveal gate. The answer stays hidden until the reader
// rates their confidence (the commitment), which is what turns a visible answer
// into retrieval practice + calibration (hypercorrection). `run` reframes it as
// an empirical "predict the output, then run it" probe.
const props = withDefaults(defineProps<{ variant?: 'predict' | 'run' }>(), {
  variant: 'predict',
})

const confidence = ref<number | null>(null)
const revealed = ref(false)

const label = (name: string, size: number, text = '') => icon(name, size) + text

const heading = computed(() =>
  props.variant === 'run'
    ? label('terminal', 14, 'Verify it yourself')
    : label('flask-conical', 14, 'Self-Test'),
)
const prompt = computed(() =>
  props.variant === 'run'
    ? 'Predict the output, then run it and compare.'
    : 'Answer from memory first, then commit.',
)
const calibration = computed(() =>
  confidence.value == null
    ? ''
    : `You rated ${confidence.value}/5. The gap between how sure you felt and how right you were is the part worth remembering.`,
)

function commit(n: number) {
  confidence.value = n
  revealed.value = true
}
</script>

<template>
  <div class="self-test" :class="`is-${variant}`">
    <div class="st-head">
      <span class="st-title" v-html="heading" />
      <span class="st-prompt">{{ prompt }}</span>
    </div>

    <div class="st-question">
      <slot />
    </div>

    <div v-if="!revealed" class="st-gate">
      <span class="st-gate-label">How sure are you?</span>
      <div class="st-scale" role="group" aria-label="Rate your confidence from 1 to 5">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          class="st-dot"
          :aria-label="`Confidence ${n} of 5 — reveal answer`"
          @click="commit(n)"
        >
          {{ n }}
        </button>
      </div>
      <button type="button" class="st-skip" @click="revealed = true">reveal without rating</button>
    </div>

    <div v-show="revealed" class="st-answer">
      <p v-if="calibration" class="st-calibration">{{ calibration }}</p>
      <slot name="answer" />
    </div>
  </div>
</template>

<style scoped>
.self-test {
  margin: 22px 0;
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid var(--silicon-prompt);
  border-radius: 0 10px 10px 0;
  background:
    linear-gradient(rgba(74, 222, 128, 0.05), rgba(74, 222, 128, 0.05)),
    var(--vp-c-bg-soft);
  padding: 14px 18px;
}
.self-test.is-run {
  border-left-color: var(--vp-c-brand-1);
  background:
    linear-gradient(var(--vp-c-brand-soft), var(--vp-c-brand-soft)),
    var(--vp-c-bg-soft);
}
.st-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin-bottom: 10px;
}
.st-title {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--silicon-prompt);
}
.is-run .st-title {
  color: var(--vp-c-brand-1);
}
.st-prompt {
  font-size: 13px;
  color: var(--vp-c-text-3);
}
.st-question :deep(> :first-child) {
  margin-top: 0;
}
.st-question :deep(> :last-child) {
  margin-bottom: 0;
}
.st-gate {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--vp-c-divider);
}
.st-gate-label {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.st-scale {
  display: inline-flex;
  gap: 6px;
}
.st-dot {
  width: 30px;
  height: 30px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.st-dot:hover {
  border-color: var(--silicon-prompt);
  color: var(--silicon-prompt);
  background: var(--vp-c-bg-soft);
}
.st-skip {
  margin-left: auto;
  background: none;
  border: none;
  padding: 0;
  color: var(--vp-c-text-3);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.st-skip:hover {
  color: var(--vp-c-text-2);
}
.st-answer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--vp-c-divider);
}
.st-calibration {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--silicon-prompt);
}
.st-answer :deep(> :last-child) {
  margin-bottom: 0;
}
</style>
