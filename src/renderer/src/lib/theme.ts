const THEME_KEY = 'arhlinx.theme'
const SIDEBAR_KEY = 'arhlinx.sidebar-collapsed'

export type UiTheme = 'light' | 'dark'

export function readTheme(): UiTheme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: UiTheme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // storage unavailable: theme still applied for this session
  }
}

export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed))
  } catch {
    // ignore
  }
}
