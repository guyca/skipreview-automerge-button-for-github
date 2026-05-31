import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: "Skip Review & Auto Merge Button for GitHub",
  description: "A Chrome extension that adds a 'Skip Review & Auto Merge' button to GitHub pull requests, allowing users to bypass the review process and automatically merge their pull requests.",
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
  },
  content_scripts: [{
    js: ['src/content/main.ts'],
    matches: ['https://github.com/*'],
  }],
})
