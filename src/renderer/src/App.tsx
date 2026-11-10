import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { DashboardPage } from './pages/DashboardPage'
import { ModulePage } from './pages/ModulePage'
import { WifiPage } from './pages/WifiPage'
import { SpeedPage } from './pages/SpeedPage'
import { UsagePage } from './pages/UsagePage'
import { FirewallPage } from './pages/FirewallPage'
import { NetworkPage } from './pages/NetworkPage'
import { DhcpPage } from './pages/DhcpPage'
import { DevicesPage } from './pages/DevicesPage'
import { CoveragePage } from './pages/CoveragePage'
import { MonitorPage } from './pages/MonitorPage'
import { SettingsPage } from './pages/SettingsPage'
import { useRoute } from './lib/router'
import { getSystemInfo } from './lib/bridge'
import { applyTheme, readSidebarCollapsed, readTheme, saveSidebarCollapsed, type UiTheme } from './lib/theme'
import type { SystemInfo } from '@shared/types'

export default function App(): React.JSX.Element {
  const { route, navigate } = useRoute()
  const [collapsed, setCollapsed] = useState<boolean>(readSidebarCollapsed)
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<UiTheme>(readTheme)
  const [info, setInfo] = useState<SystemInfo | null>(null)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    let active = true
    void getSystemInfo().then((value) => {
      if (active) setInfo(value)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setCollapsed((current) => {
          saveSidebarCollapsed(!current)
          return !current
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleSidebar = (): void => {
    setCollapsed((current) => {
      saveSidebarCollapsed(!current)
      return !current
    })
  }

  const toggleTheme = (): void => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const page = ((): React.JSX.Element => {
    switch (route) {
      case 'dashboard':
        return <DashboardPage info={info} onNavigate={navigate} />
      case 'wifi':
        return <WifiPage />
      case 'speed-test':
        return <SpeedPage />
      case 'data-manager':
        return <UsagePage />
      case 'firewall':
        return <FirewallPage />
      case 'wifi-advanced':
        return <NetworkPage focus="wifi-advanced" />
      case 'internet':
        return <NetworkPage focus="internet" />
      case 'dhcp':
        return <DhcpPage />
      case 'devices':
        return <DevicesPage />
      case 'coverage':
        return <CoveragePage />
      case 'monitor':
        return <MonitorPage />
      case 'settings':
        return <SettingsPage theme={theme} onToggleTheme={toggleTheme} />
      default:
        return <ModulePage route={route} onNavigate={navigate} />
    }
  })()

  return (
    <div className="flex h-full flex-col bg-canvas text-fg">
      <div className="flex min-h-0 flex-1">
        <Sidebar
          collapsed={collapsed}
          route={route}
          query={query}
          onQueryChange={setQuery}
          onToggle={toggleSidebar}
          onNavigate={navigate}
          version={info?.appVersion ?? '0.1.0'}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            route={route}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <main className="flex-1 overflow-y-auto">{page}</main>
        </div>
      </div>
    </div>
  )
}
