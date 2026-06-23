<script setup lang="ts">
import DefaultTheme from 'vitepress/theme-without-fonts'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <!-- terminal status line at the foot of every doc page -->
    <template #doc-footer-before>
      <div class="terminal-status">from silicon to the screen</div>
    </template>
  </Layout>
</template>

<style>
.terminal-status {
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px dashed var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}
.terminal-status::before {
  content: '$ ';
  color: var(--silicon-prompt);
}
.terminal-status::after {
  content: '_';
  margin-left: 2px;
  color: var(--silicon-prompt);
  animation: silicon-blink 1.1s step-end infinite;
}
@keyframes silicon-blink {
  50% { opacity: 0; }
}
</style>
