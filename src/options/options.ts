interface Settings {
  updateBranchEnabled: boolean
  excludedRepos: string[]
}

const DEFAULTS: Settings = { updateBranchEnabled: true, excludedRepos: [] }

async function load(): Promise<Settings> {
  const raw = await chrome.storage.sync.get(DEFAULTS as unknown as Record<string, unknown>)
  return raw as unknown as Settings
}

async function save(settings: Settings): Promise<void> {
  await chrome.storage.sync.set(settings as unknown as Record<string, unknown>)
}

function showStatus() {
  const el = document.getElementById('status')!
  el.textContent = 'Saved'
  setTimeout(() => { el.textContent = '' }, 1500)
}

function renderList(repos: string[], onRemove: (repo: string) => void) {
  const ul = document.getElementById('repoList')!
  ul.innerHTML = ''
  repos.forEach((repo) => {
    const li = document.createElement('li')
    li.textContent = repo
    const btn = document.createElement('button')
    btn.textContent = 'Remove'
    btn.addEventListener('click', () => onRemove(repo))
    li.appendChild(btn)
    ul.appendChild(li)
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await load()

  const checkbox = document.getElementById('updateBranchEnabled') as HTMLInputElement
  const repoInput = document.getElementById('repoInput') as HTMLInputElement
  const addBtn = document.getElementById('addRepo') as HTMLButtonElement

  checkbox.checked = settings.updateBranchEnabled

  const persist = async () => {
    await save(settings)
    showStatus()
    renderList(settings.excludedRepos, remove)
  }

  const remove = async (repo: string) => {
    settings.excludedRepos = settings.excludedRepos.filter(r => r !== repo)
    await persist()
  }

  renderList(settings.excludedRepos, remove)

  checkbox.addEventListener('change', () => {
    settings.updateBranchEnabled = checkbox.checked
    persist()
  })

  const addRepo = () => {
    const val = repoInput.value.trim()
    if (!val.includes('/') || settings.excludedRepos.includes(val)) return
    repoInput.value = ''
    settings.excludedRepos = [...settings.excludedRepos, val]
    persist()
  }

  addBtn.addEventListener('click', addRepo)
  repoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addRepo() })
})
