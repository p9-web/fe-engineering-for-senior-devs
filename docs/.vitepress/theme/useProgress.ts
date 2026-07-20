// Reader progress, persisted in localStorage. A single shared reactive state
// backs every component (per-module toggle + home-page bar) so they stay in sync.
// SSR-safe: state starts empty and is only read from localStorage in hydrate(),
// which components call from onMounted — never during setup/SSR.
import { ref } from 'vue'

const KEY = 'fe-course:progress:v1'
// Fixed curriculum size (Tiers 1–4 × 4 modules = 16). If the module count ever
// changes, update this — it's the denominator for the progress bar.
const TOTAL = 16

type Progress = Record<number, string> // module number -> ISO completed-at

const state = ref<Progress>({})
let hydrated = false

function persist() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(state.value))
  } catch {
    // storage full / disabled (private mode) — progress is best-effort, ignore
  }
}

function parse(raw: string | null): Progress {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as Progress) : {}
  } catch {
    return {}
  }
}

// Load persisted state and keep other tabs in sync. Idempotent + client-only.
function hydrate() {
  if (hydrated || typeof window === 'undefined' || typeof localStorage === 'undefined') return
  hydrated = true
  state.value = parse(localStorage.getItem(KEY))
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) state.value = parse(e.newValue)
  })
}

export function useProgress() {
  return {
    state,
    total: TOTAL,
    isComplete: (m: number) => m in state.value,
    completedCount: () => Object.keys(state.value).length,
    toggle(m: number) {
      const next = { ...state.value }
      if (m in next) delete next[m]
      else next[m] = new Date().toISOString()
      state.value = next
      persist()
    },
    reset() {
      state.value = {}
      persist()
    },
    hydrate,
  }
}
