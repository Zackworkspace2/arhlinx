export interface SystemInfo {
  appVersion: string
  platform: string
  arch: string
  browser: string
  online: boolean
}

export interface WifiAdapter {
  name: string
  adminState: string
  state: string
  type: string
}

export interface WifiConnection {
  name: string | null
  description: string | null
  state: string | null
  ssid: string | null
  bssid: string | null
  networkType: string | null
  radioType: string | null
  authentication: string | null
  cipher: string | null
  channel: number | null
  receiveRate: number | null
  transmitRate: number | null
  signal: number | null
  profile: string | null
}

export type WifiDetailReason = 'elevation' | 'no-adapter' | 'error' | null

export interface WifiStatus {
  adapter: WifiAdapter | null
  adapters: WifiAdapter[]
  connection: WifiConnection | null
  detailError: string | null
  detailReason: WifiDetailReason
  adapterError: string | null
  checkedAt: string
}

export interface WifiBssid {
  bssid: string
  signal: number | null
  radioType: string
  band: string
  channel: number | null
}

export interface WifiNetwork {
  ssid: string
  hidden: boolean
  networkType: string
  authentication: string
  encryption: string
  bssids: WifiBssid[]
  bestSignal: number
  open: boolean
}

export interface WifiScan {
  interfaceName: string | null
  networks: WifiNetwork[]
  error: string | null
}

export interface WifiProfile {
  name: string
  groupPolicy: boolean
}

export interface WifiProfiles {
  interfaceName: string | null
  profiles: WifiProfile[]
  error: string | null
}

export type SpeedPhase = 'ping' | 'download' | 'upload'

export interface SpeedTestResult {
  id: number
  at: string
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  target: string
}

export interface SpeedHistory {
  results: SpeedTestResult[]
}

export interface UsageBytes {
  rx: number
  tx: number
}

export interface UsageDay extends UsageBytes {
  date: string
}

export interface UsageSummary {
  sampledAt: string
  startedAt: string | null
  running: boolean
  source: string
  error: string | null
  rateRx: number
  rateTx: number
  today: UsageBytes
  month: UsageBytes
  days: UsageDay[]
  limitGb: number | null
  alertPercent: number
}

export interface FirewallProfile {
  profile: string
  state: string | null
  policy: string | null
  localRules: string | null
  inbound: string | null
  outbound: string | null
  logging: string | null
  allowLocalFirewallRules: string | null
}

export interface FirewallRule {
  name: string
  enabled: string | null
  direction: string | null
  profiles: string | null
  protocol: string | null
  localPort: string | null
  remotePort: string | null
  action: string | null
  grouping: string | null
}

export interface FirewallStatus {
  profiles: FirewallProfile[]
  rules: FirewallRule[]
  ruleCount: number
  enabledRuleCount: number
  error: string | null
  rulesError: string | null
  elevationRequired: boolean
  checkedAt: string
}

export interface NetworkAdapter {
  name: string
  description: string | null
  mac: string | null
  dhcpEnabled: boolean | null
  dhcpServer: string | null
  leaseObtained: string | null
  leaseExpires: string | null
  ipv4: string[]
  subnetMasks: string[]
  ipv6: string[]
  gateways: string[]
  dns: string[]
  connectionSuffix: string | null
  mediaState: string | null
}

export interface NetworkConfig {
  adapters: NetworkAdapter[]
  hostname: string | null
  error: string | null
  elevationHint: string | null
  checkedAt: string
}

export interface CoverageChannel {
  band: string
  channel: number
  aps: number
  maxSignal: number
}

export interface Coverage {
  networkCount: number
  apCount: number
  bands: Record<string, number>
  channels: CoverageChannel[]
  signalBuckets: { label: string; count: number }[]
  avgSignal: number | null
  strongest: { ssid: string; signal: number } | null
  weakest: { ssid: string; signal: number } | null
  openCount: number
  recommendations: string[]
  interfaceName: string | null
  scanError: string | null
  scannedAt: string
}

export interface ConnectionRow {
  protocol: string
  local: string
  remote: string
  state: string | null
  pid: number | null
}

export interface ConnectionsResult {
  connections: ConnectionRow[]
  summary: { byState: Record<string, number>; byProtocol: Record<string, number> }
  total: number
  error: string | null
  checkedAt: string
}

export interface Traffic {
  rateRx: number
  rateTx: number
  today: UsageBytes
  month: UsageBytes
  sampledAt: string
  error: string | null
}

export interface PingResult {
  host: string
  port: number
  attempts: number
  received: number
  lossPercent: number
  minMs: number | null
  avgMs: number | null
  maxMs: number | null
  samples: number[]
}

export interface LanDevice {
  ip: string
  mac: string | null
  name: string | null
  online: boolean
  type: string
  self: boolean
  gateway: boolean
}

export interface WhoAmI {
  ip: string | null
  city: string | null
  region: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  isp: string | null
  asn: string | null
  userAgent: string | null
  source: string
}

export interface DeviceScan {
  adapter: { name: string; ip: string; mask: string; description: string | null } | null
  subnet: string | null
  hostsInSubnet: number
  devices: LanDevice[]
  onlineCount: number
  durationMs: number
  error: string | null
  scannedAt: string
}

export interface Overview {
  wifi: {
    adapterState: string | null
    ssid: string | null
    signal: number | null
    detailError: string | null
  } | null
  usage: {
    today: UsageBytes
    month: UsageBytes
    rateRx: number
    rateTx: number
  } | null
  lastSpeed: SpeedTestResult | null
  firewall: { on: number; off: number; total: number } | null
  hostname: string | null
  generatedAt: string
}
