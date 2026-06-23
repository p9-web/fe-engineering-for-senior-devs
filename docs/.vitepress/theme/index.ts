// Custom "terminal / silicon" theme — extends the default theme with our own fonts + tokens.
import DefaultTheme from 'vitepress/theme-without-fonts'
import Layout from './Layout.vue'
import './fonts.css'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
}
