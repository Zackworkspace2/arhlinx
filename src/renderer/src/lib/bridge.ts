import type { SystemInfo } from '@shared/types'
import { APP_VERSION } from './version'

function detectBrowser(userAgent: string): string {
  if (userAgent.includes('Edg/')) return 'Edge'
  if (userAgent.includes('OPR/')) return 'Opera'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Safari/')) return 'Safari'
  return 'Browser'
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return {
    appVersion: APP_VERSION,
    platform: navigator.platform || 'web',
    arch: 'web',
    browser: detectBrowser(navigator.userAgent),
    online: navigator.onLine
  }
}
