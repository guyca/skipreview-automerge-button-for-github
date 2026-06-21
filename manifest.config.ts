import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: "Skip Review & Auto Merge Button for GitHub",
  description: "Adds a 'Skip Review & Auto Merge' button to GitHub PRs to bypass the review process and auto-merge pull requests.",
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
  },
  permissions: ['storage'],
  options_page: 'src/options/options.html',
  content_scripts: [{
    js: ['src/content/main.ts'],
    matches: ['https://github.com/*'],
  }],
})
