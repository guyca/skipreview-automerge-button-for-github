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

function injectButton(textarea: HTMLTextAreaElement, submitBtn: HTMLButtonElement) {
  const actionArea = submitBtn.parentElement
  if (!actionArea || actionArea.querySelector(`[${INJECTED_ATTR}]`)) return

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = SKIP_TEXT
  btn.className = submitBtn.className
  btn.setAttribute(INJECTED_ATTR, 'true')

  const sync = () => { btn.disabled = textarea.value.trim().length > 0 }
  sync()
  textarea.addEventListener('input', sync)

  btn.addEventListener('click', () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(textarea, SKIP_TEXT)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))
    submitBtn.click()
    if (shouldAutoUpdateBranch()) waitForUpdateBranch()
  })

  btn.style.marginRight = '4px'
  actionArea.insertBefore(btn, submitBtn)
}

function isPrInactive(): boolean {
  if (document.querySelector('[data-status="pullMerged"], [data-status="pullClosed"]')) return true
  const heading = document.querySelector('[data-testid="mergebox-border-container"] h3')
  return !!(heading?.textContent?.includes('successfully merged'))
}

function tryInject() {
  if (isPrInactive()) {
    document.querySelectorAll(`[${INJECTED_ATTR}]`).forEach(el => el.remove())
    return
  }
  Array.from(document.querySelectorAll('form')).forEach((form) => {
    if (!form.matches('#new_comment_form, .js-new-comment-form')) return
    const textarea = form.querySelector('textarea.comment-form-textarea, textarea.js-comment-field') as HTMLTextAreaElement | null
    if (!textarea) return
    const submitBtn = Array.from(form.querySelectorAll('button[type="submit"]'))
      .find(b => b.textContent?.trim() === 'Comment') as HTMLButtonElement | undefined
    if (!submitBtn) return
    injectButton(textarea, submitBtn)
  })
}

loadSettings()
document.addEventListener('turbo:load', loadSettings)
const observer = new MutationObserver(tryInject)
observer.observe(document.body, { childList: true, subtree: true })
document.addEventListener('turbo:load', tryInject)
tryInject()
