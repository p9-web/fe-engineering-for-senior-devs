// Custom "terminal / silicon" theme — extends the default theme with our own fonts + tokens.
import DefaultTheme from 'vitepress/theme-without-fonts'
import type { EnhanceAppContext } from 'vitepress'
import Layout from './Layout.vue'
import Mermaid from './Mermaid.vue'
import './fonts.css'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }: EnhanceAppContext) {
    app.component('Mermaid', Mermaid) // renders ```mermaid fences (see config.mts fence rule)
  },
}
