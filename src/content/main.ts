const SKIP_TEXT = '#skipreview #automerge'
const INJECTED_ATTR = 'data-skip-review-btn'

interface Settings { updateBranchEnabled: boolean; excludedRepos: string[] }
const DEFAULT_SETTINGS: Settings = { updateBranchEnabled: true, excludedRepos: [] }
let cachedSettings: Settings = { ...DEFAULT_SETTINGS }

async function loadSettings() {
  const raw = await chrome.storage.sync.get(DEFAULT_SETTINGS as unknown as Record<string, unknown>)
  cachedSettings = raw as unknown as Settings
}

function getCurrentRepo(): string {
  const parts = window.location.pathname.split('/').filter(Boolean)
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : ''
}

function shouldAutoUpdateBranch(): boolean {
  if (!cachedSettings.updateBranchEnabled) return false
  const repo = getCurrentRepo()
  return !repo || !cachedSettings.excludedRepos.includes(repo)
}

function isVisible(el: HTMLElement): boolean {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
}

function findUpdateBranchBtn(): HTMLButtonElement | null {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find(b => b.textContent?.trim() === 'Update branch' && isVisible(b)) ?? null
}

function waitForUpdateBranch(timeoutMs = 10_000) {
  const existing = findUpdateBranchBtn()
  if (existing) { existing.click(); return }

  const obs = new MutationObserver(() => {
    const btn = findUpdateBranchBtn()
    if (!btn) return
    obs.disconnect()
    clearTimeout(timer)
    btn.click()
  })
  obs.observe(document.body, { childList: true, subtree: true })
  const timer = setTimeout(() => obs.disconnect(), timeoutMs)
}

function isSubmittable(b: HTMLButtonElement | null): b is HTMLButtonElement {
  return !!b && b.isConnected && !b.disabled &&
    b.getAttribute('aria-disabled') !== 'true' && !b.hasAttribute('data-inactive')
}

// Redesigned layout re-renders the submit button after the value changes, so re-resolve it until it's enabled
function clickWhenReady(find: () => HTMLButtonElement | null, timeoutMs = 3000) {
  const start = performance.now()
  const tick = () => {
    const b = find()
    if (isSubmittable(b)) { b.click(); return }
    if (performance.now() - start < timeoutMs) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function injectButton(textarea: HTMLTextAreaElement, submitBtn: HTMLButtonElement, findSubmit?: () => HTMLButtonElement | null) {
  const actionArea = submitBtn.parentElement
  if (!actionArea || actionArea.querySelector(`[${INJECTED_ATTR}]`)) return

  const legacy = !!textarea.closest('#new_comment_form, .js-new-comment-form')
  let btn: HTMLButtonElement
  if (legacy) {
    btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = SKIP_TEXT
    btn.className = submitBtn.className
  } else {
    // Redesigned layout: clone so attribute-driven styling (e.g. data-variant) carries over
    btn = submitBtn.cloneNode(false) as HTMLButtonElement
    btn.removeAttribute('id')
    btn.removeAttribute('aria-disabled')
    btn.removeAttribute('data-inactive')
    btn.removeAttribute('data-dd-action-name')
    btn.type = 'button'
    btn.textContent = SKIP_TEXT
  }
  btn.setAttribute(INJECTED_ATTR, 'true')

  const sync = () => { btn.disabled = textarea.value.trim().length > 0 }
  sync()
  textarea.addEventListener('input', sync)

  btn.addEventListener('click', () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(textarea, SKIP_TEXT)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))
    if (legacy) submitBtn.click()
    else clickWhenReady(() => findSubmit?.() ?? submitBtn)
    if (shouldAutoUpdateBranch()) waitForUpdateBranch()
  })

  btn.style.marginRight = '4px'
  actionArea.insertBefore(btn, submitBtn)
}

function isPrInactive(): boolean {
  if (document.querySelector('[data-status="pullMerged"], [data-status="pullClosed"]')) return true
  const heading = document.querySelector('[data-testid="mergebox-border-container"] h3')
  if (heading?.textContent?.includes('successfully merged')) return true
  // Redesigned layout: merged PRs show Revert / Restore branch buttons
  return Array.from(document.querySelectorAll('button'))
    .some(b => ['Revert', 'Restore branch'].includes(b.textContent?.trim() ?? '') && isVisible(b))
}

const LEGACY_FORM = '#new_comment_form, .js-new-comment-form'
const LEGACY_TEXTAREA = 'textarea.comment-form-textarea, textarea.js-comment-field'
const NEW_TEXTAREA = 'textarea[placeholder="Leave a comment"]'

function injectLegacy() {
  Array.from(document.querySelectorAll('form')).forEach((form) => {
    if (!form.matches(LEGACY_FORM)) return
    const textarea = form.querySelector(LEGACY_TEXTAREA) as HTMLTextAreaElement | null
    if (!textarea) return
    const submitBtn = Array.from(form.querySelectorAll('button[type="submit"]'))
      .find(b => b.textContent?.trim() === 'Comment') as HTMLButtonElement | undefined
    if (!submitBtn) return
    injectButton(textarea, submitBtn)
  })
}

// Redesigned layout: nearest ancestor of the textarea containing exactly one "Comment" button
function findRedesignedSubmit(textarea: HTMLTextAreaElement): HTMLButtonElement | null {
  let el: HTMLElement | null = textarea.parentElement
  for (let i = 0; el && i < 10; i++, el = el.parentElement) {
    const matches = Array.from(el.querySelectorAll('button'))
      .filter(b => b.textContent?.trim() === 'Comment' && !b.hasAttribute(INJECTED_ATTR))
    if (matches.length > 1) return null
    if (matches.length === 1) return matches[0]
  }
  return null
}

function injectRedesigned() {
  document.querySelectorAll<HTMLTextAreaElement>(NEW_TEXTAREA).forEach((textarea) => {
    if (textarea.matches(LEGACY_TEXTAREA) || textarea.closest(LEGACY_FORM)) return
    if (textarea.closest('.js-inline-comment-form, .review-thread-reply, [data-testid*="review-thread"]')) return
    const submitBtn = findRedesignedSubmit(textarea)
    if (submitBtn) injectButton(textarea, submitBtn, () => findRedesignedSubmit(textarea))
  })
}

// Redesigned layout: header "Submit review" button(s) (the review popover's own submit button lacks this action name)
const HEADER_SUBMIT_REVIEW = 'button[data-dd-action-name="pull_requests.review.open"]'

// Delegates to the comment-box skip button so both share the same submit + update-branch flow
function injectHeaderButtons() {
  document.querySelectorAll<HTMLButtonElement>(HEADER_SUBMIT_REVIEW).forEach((submitBtn) => {
    const container = submitBtn.parentElement
    if (!container || container.querySelector(`[${INJECTED_ATTR}="header"]`)) return

    const btn = submitBtn.cloneNode(false) as HTMLButtonElement
    ;['id', 'style', 'aria-expanded', 'aria-haspopup', 'aria-controls', 'data-dd-action-name']
      .forEach(a => btn.removeAttribute(a))
    btn.type = 'button'
    btn.textContent = SKIP_TEXT
    btn.setAttribute(INJECTED_ATTR, 'header')
    btn.addEventListener('click', () => {
      document.querySelector<HTMLButtonElement>(`[${INJECTED_ATTR}="true"]:not(:disabled)`)?.click()
    })
    container.insertBefore(btn, submitBtn)
  })
}

function tryInject() {
  if (isPrInactive()) {
    document.querySelectorAll(`[${INJECTED_ATTR}]`).forEach(el => el.remove())
    return
  }
  injectLegacy()
  injectRedesigned()
  injectHeaderButtons()
}

loadSettings()
document.addEventListener('turbo:load', loadSettings)
const observer = new MutationObserver(tryInject)
observer.observe(document.body, { childList: true, subtree: true })
document.addEventListener('turbo:load', tryInject)
tryInject()
