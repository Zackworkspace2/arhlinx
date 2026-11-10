import {
  Activity,
  ArrowLeftRight,
  Database,
  Gauge,
  Globe,
  LayoutDashboard,
  MonitorSmartphone,
  Network,
  Radar,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
  type LucideIcon
} from 'lucide-react'

export type RouteId =
  | 'dashboard'
  | 'speed-test'
  | 'data-manager'
  | 'firewall'
  | 'wifi'
  | 'wifi-advanced'
  | 'internet'
  | 'devices'
  | 'dhcp'
  | 'coverage'
  | 'monitor'
  | 'settings'

export interface RouteMeta {
  label: string
  description: string
  phase: number
  status: 'live' | 'planned'
  icon: LucideIcon
}

export const ROUTE_META: Record<RouteId, RouteMeta> = {
  dashboard: {
    label: 'Dashboard',
    description: 'Network overview',
    phase: 2,
    status: 'live',
    icon: LayoutDashboard
  },
  'speed-test': {
    label: 'Internet Speed Test',
    description: 'Download, upload, ping and history',
    phase: 4,
    status: 'live',
    icon: Gauge
  },
  'data-manager': {
    label: 'Data Manager',
    description: 'Usage tracking, limits and alerts',
    phase: 5,
    status: 'live',
    icon: Database
  },
  firewall: {
    label: 'Firewall & Security',
    description: 'Firewall status, rules and activity',
    phase: 6,
    status: 'live',
    icon: ShieldCheck
  },
  wifi: {
    label: 'Wi-Fi Settings',
    description: 'Scan, connect and manage networks',
    phase: 3,
    status: 'live',
    icon: Wifi
  },
  'wifi-advanced': {
    label: 'Advanced Wi-Fi',
    description: 'Adapter, channel and radio detail',
    phase: 7,
    status: 'live',
    icon: SlidersHorizontal
  },
  internet: {
    label: 'Internet Settings',
    description: 'DNS, IPv4, IPv6 and routing',
    phase: 7,
    status: 'live',
    icon: Globe
  },
  dhcp: {
    label: 'DHCP Manager',
    description: 'Leases, reservations and clients',
    phase: 8,
    status: 'live',
    icon: ArrowLeftRight
  },
  devices: {
    label: 'Devices',
    description: 'Phones, laptops and clients on this network',
    phase: 11,
    status: 'live',
    icon: MonitorSmartphone
  },
  coverage: {
    label: 'Placement & Coverage',
    description: 'Signal analysis and placement advice',
    phase: 9,
    status: 'live',
    icon: Radar
  },
  monitor: {
    label: 'Network Monitor',
    description: 'Live traffic, connections and logs',
    phase: 10,
    status: 'live',
    icon: Activity
  },
  settings: {
    label: 'Application Settings',
    description: 'Preferences, data and privacy',
    phase: 11,
    status: 'live',
    icon: Settings
  }
}

export interface NavGroup {
  title: string
  items: RouteId[]
}

export const NAV_GROUPS: NavGroup[] = [
  { title: 'Overview', items: ['dashboard'] },
  { title: 'Connectivity', items: ['speed-test', 'wifi', 'wifi-advanced', 'internet'] },
  { title: 'Traffic & Data', items: ['data-manager', 'monitor'] },
  { title: 'Security', items: ['firewall'] },
  { title: 'Network Ops', items: ['devices', 'dhcp', 'coverage'] },
  { title: 'System', items: ['settings'] }
]

export const ROUTE_IDS = Object.keys(ROUTE_META) as RouteId[]

export function isRouteId(value: string): value is RouteId {
  return ROUTE_IDS.includes(value as RouteId)
}

export const NETWORK_ICON = Network
