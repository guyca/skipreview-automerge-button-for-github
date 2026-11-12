# Privacy Policy

If you add or change any of the following, update `privacy-policy.html` to reflect the change:

- `permissions` in `manifest.config.ts`
- Network requests (`fetch`, `XMLHttpRequest`, `WebSocket`)
- Browser storage (`chrome.storage`, `localStorage`, `sessionStorage`, cookies)
- `content_scripts.matches` (sites the extension runs on)

# GitHub DOM Changes

Never guess GitHub's HTML. Any change to selectors, DOM lookups, or injected elements requires fresh HTML obtained from the user's Chrome (via AppleScript `execute javascript`) in the same session, from a live PR page. Verify the selector against that output before editing.

- Background tabs hang on JavaScript: briefly set the tab active, then restore the original active tab.
- Chrome must have "Allow JavaScript from Apple Events" enabled.
