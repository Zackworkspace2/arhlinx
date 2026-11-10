import { exec, isElevationError } from './exec.mjs'

const MAX_RULES = 300

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function parseFirewallProfiles(output) {
  const profiles = []
  const blocks = output.split(/\n(?=(?:Domain|Private|Public) Profile Settings:)/i)

  for (const block of blocks) {
    const header = block.match(/^(Domain|Private|Public) Profile Settings:/i)
    if (!header) continue

    const fields = new Map()
    const pattern = /^\s*([A-Za-z][A-Za-z0-9 ()\/-]*?)\s{2,}(.+)$/gm
    let match
    while ((match = pattern.exec(block)) !== null) {
      fields.set(match[1].trim().toLowerCase(), clean(match[2]))
    }

    profiles.push({
      profile: header[1],
      state: fields.get('state') ?? null,
      policy: fields.get('firewall policy') ?? null,
      localRules: fields.get('localfirewallrules') ?? null,
      inbound: fields.get('inboundusernotification') ?? null,
      outbound: fields.get('outboundconnections') ?? null,
      logging: fields.get('logconnections') ?? null,
      allowLocalFirewallRules: fields.get('allowlocalfirewallrules') ?? null
    })
  }
  return profiles
}

export function parseFirewallRules(output) {
  const rules = []
  const blocks = output.split(/\n(?=Rule Name:\s)/)

  for (const block of blocks) {
    const nameMatch = block.match(/Rule Name:\s*(.+)/)
    if (!nameMatch) continue

    const field = (label) => {
      const match = block.match(new RegExp(`^\\s*${label}:\\s*(.+)$`, 'im'))
      return match ? clean(match[1]) : null
    }

    rules.push({
      name: clean(nameMatch[1]),
      enabled: field('Enabled'),
      direction: field('Direction'),
      profiles: field('Profiles'),
      protocol: field('Protocol'),
      localPort: field('LocalPort'),
      remotePort: field('RemotePort'),
      action: field('Action'),
      grouping: field('Grouping')
    })
  }
  return rules
}

export async function readFirewall() {
  const profilesResult = await exec('netsh', ['advfirewall', 'show', 'allprofiles'])
  const profiles = parseFirewallProfiles(profilesResult.output)

  const rulesResult = await exec('netsh', ['advfirewall', 'firewall', 'show', 'rule', 'name=all'], {
    timeout: 25000
  })
  const allRules = parseFirewallRules(rulesResult.output)

  const elevation = isElevationError(profilesResult.error) || isElevationError(rulesResult.error)

  const enabled = allRules.filter((rule) => /^yes$/i.test(rule.enabled ?? '')).length
  return {
    profiles,
    rules: allRules.slice(0, MAX_RULES),
    ruleCount: allRules.length,
    enabledRuleCount: enabled,
    error: profiles.length === 0 ? (profilesResult.error ?? 'No firewall profiles reported') : null,
    rulesError: allRules.length === 0 ? (rulesResult.error ?? 'No firewall rules reported') : null,
    elevationRequired: elevation,
    checkedAt: new Date().toISOString()
  }
}
