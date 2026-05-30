const SKIP_TEXT = '#skipreview #automerge'
const INJECTED_ATTR = 'data-skip-review-btn'

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
  })

  btn.style.marginRight = '4px'
  actionArea.insertBefore(btn, submitBtn)
}

function isPrMerged(): boolean {
  return !!document.querySelector('[data-status="pullMerged"]')
}

function tryInject() {
  if (isPrMerged()) {
    document.querySelectorAll(`[${INJECTED_ATTR}]`).forEach(el => el.remove())
    return
  }
  Array.from(document.querySelectorAll('form')).forEach((form) => {
    const textarea = form.querySelector('textarea.comment-form-textarea, textarea.js-comment-field') as HTMLTextAreaElement | null
    if (!textarea) return
    const submitBtn = Array.from(form.querySelectorAll('button[type="submit"]'))
      .find(b => b.textContent?.trim() === 'Comment') as HTMLButtonElement | undefined
    if (!submitBtn) return
    injectButton(textarea, submitBtn)
  })
}

const observer = new MutationObserver(tryInject)
observer.observe(document.body, { childList: true, subtree: true })
document.addEventListener('turbo:load', tryInject)
tryInject()
