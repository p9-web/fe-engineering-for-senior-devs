<script setup lang="ts">
import DefaultTheme from 'vitepress/theme-without-fonts'
import StudyGuide from './StudyGuide.vue'
import ProgressToggle from './ProgressToggle.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <!-- learning scaffold above the content (renders only when the page has a `learn:` block) -->
    <template #doc-before>
      <StudyGuide />
    </template>
    <!-- per-module "mark complete" toggle + progress meter (module pages only) -->
    <template #doc-footer-before>
      <ProgressToggle />
    </template>
  </Layout>
</template>
