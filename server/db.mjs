import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DB_PATH = process.env.ARHLINX_DB ?? join(process.cwd(), 'data', 'arhlinx.db')
mkdirSync(dirname(DB_PATH), { recursive: true })

const db = new DatabaseSync(DB_PATH)
db.exec(`
  CREATE TABLE IF NOT EXISTS speed_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    download REAL NOT NULL,
    upload REAL NOT NULL,
    ping REAL NOT NULL,
    jitter REAL NOT NULL,
    target TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS usage_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    rx INTEGER NOT NULL,
    tx INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS usage_samples_at ON usage_samples (at);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

function toRow(row) {
  return {
    id: row.id,
    at: row.at,
    downloadMbps: row.download,
    uploadMbps: row.upload,
    pingMs: row.ping,
    jitterMs: row.jitter,
    target: row.target
  }
}

export function insertSpeedTest(result) {
  const info = db
    .prepare(
      'INSERT INTO speed_tests (at, download, upload, ping, jitter, target) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      result.at,
      result.downloadMbps,
      result.uploadMbps,
      result.pingMs,
      result.jitterMs,
      result.target
    )
  return { ...result, id: Number(info.lastInsertRowid) }
}

export function listSpeedTests(limit = 20) {
  const rows = db
    .prepare(
      'SELECT id, at, download, upload, ping, jitter, target FROM speed_tests ORDER BY id DESC LIMIT ?'
    )
    .all(limit)
  return rows.map(toRow)
}

/** Local-time stamp, sortable as text: YYYY-MM-DD HH:MM:SS */
export function localStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

export function insertUsageSample(at, rx, tx) {
  db.prepare('INSERT INTO usage_samples (at, rx, tx) VALUES (?, ?, ?)').run(at, rx, tx)
}

export function usageTotals(sinceClause) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(rx), 0) AS rx, COALESCE(SUM(tx), 0) AS tx FROM usage_samples WHERE ${sinceClause}`
    )
    .get()
  return { rx: Number(row.rx), tx: Number(row.tx) }
}

export function usageDays(days = 14) {
  const rows = db
    .prepare(
      `SELECT substr(at, 1, 10) AS day, SUM(rx) AS rx, SUM(tx) AS tx
       FROM usage_samples
       WHERE at >= datetime('now', 'localtime', ?)
       GROUP BY day
       ORDER BY day`
    )
    .all(`-${days - 1} days`)
  return rows.map((row) => ({ date: row.day, rx: Number(row.rx), tx: Number(row.tx) }))
}

export function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  if (!row) return fallback
  try {
    return JSON.parse(row.value)
  } catch {
    return fallback
  }
}

export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, JSON.stringify(value))
}

export function clearSpeedTests() {
  return Number(db.prepare('DELETE FROM speed_tests').run().changes)
}

export function clearUsage() {
  return Number(db.prepare('DELETE FROM usage_samples').run().changes)
}

export function closeDb() {
  db.close()
}

export { DB_PATH }
