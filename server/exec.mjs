import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * Runs a Windows CLI tool and keeps stdout even when the exit code is non-zero,
 * because most netsh/ipconfig errors are printed there.
 */
export async function exec(file, args, options = {}) {
  const { timeout = 15000, maxBuffer = 8 * 1024 * 1024 } = options
  try {
    const { stdout } = await run(file, args, {
      windowsHide: true,
      timeout,
      maxBuffer,
      encoding: 'utf8'
    })
    return { ok: true, output: stdout, error: null }
  } catch (error) {
    const stdout = typeof error.stdout === 'string' ? error.stdout : ''
    const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : ''
    const raw = stderr || stdout.trim() || error.message || `${file} failed`
    const friendly = /EPERM|spawn EPERM/i.test(raw)
      ? 'Windows blocked the system call in this environment (spawn EPERM).'
      : raw
    return { ok: false, output: stdout, error: friendly }
  }
}

export function isElevationError(message) {
  if (!message) return false
  const text = message.toLowerCase()
  return (
    text.includes('error 5') ||
    text.includes('elevation') ||
    text.includes('administrator') ||
    text.includes('access is denied')
  )
}
