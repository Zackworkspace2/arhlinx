import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { NAV_GROUPS, ROUTE_META, type RouteId } from '../navigation'

interface SidebarProps {
  collapsed: boolean
  route: RouteId
  query: string
  onQueryChange: (value: string) => void
  onToggle: () => void
  onNavigate: (id: RouteId) => void
  version: string
}

export function Sidebar({
  collapsed,
  route,
  query,
  onQueryChange,
  onToggle,
  onNavigate,
  version
}: SidebarProps): React.JSX.Element {
  const term = query.trim().toLowerCase()
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((id) => ROUTE_META[id].label.toLowerCase().includes(term))
  })).filter((group) => group.items.length > 0)

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[76px]' : 'w-[248px]'
      }`}
    >
      <div className={`flex h-16 items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-indigo-500 text-sm font-bold text-white shadow-lg shadow-accent/30">
          A
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">ArhLinx</p>
            <p className="truncate text-[11px] leading-tight text-muted">Network Control</p>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
            className="ml-auto grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-panel-2 hover:text-fg"
          >
            <PanelLeftClose size={17} />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={onToggle}
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-panel-2 hover:text-fg"
          >
            <PanelLeftOpen size={17} />
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="px-3 pb-2">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 focus-within:border-accent/60">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Filter modules"
              spellCheck={false}
              className="w-full bg-transparent text-xs text-fg outline-none placeholder:text-muted/70"
            />
          </label>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((group) => (
          <div key={group.title} className="mb-3">
            {!collapsed ? (
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/80">
                {group.title}
              </p>
            ) : (
              <div className="mx-2 mb-2 border-t border-line" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((id) => {
                const meta = ROUTE_META[id]
                const Icon = meta.icon
                const active = route === id
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(id)}
                      title={collapsed ? meta.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex w-full items-center gap-2.5 rounded-lg py-2 text-xs transition-colors ${
                        collapsed ? 'justify-center px-0' : 'px-2.5'
                      } ${
                        active
                          ? 'bg-accent-soft font-medium text-accent-strong'
                          : 'text-muted hover:bg-panel-2 hover:text-fg'
                      }`}
                    >
                      <Icon size={17} className="shrink-0" />
                      {!collapsed && <span className="truncate">{meta.label}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {groups.length === 0 && !collapsed && (
          <p className="px-2 py-4 text-xs text-muted">No modules match.</p>
        )}
      </nav>

      <div className={`border-t border-line ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
        {collapsed ? (
          <div className="grid place-items-center" title={`ArhLinx ${version}`}>
            <span className="size-1.5 rounded-full bg-ok" />
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>v{version}</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-ok" />
              local API
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
