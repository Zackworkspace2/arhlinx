import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.ARHLINX_DB = join(tmpdir(), `arhlinx-usage-${process.pid}-${Date.now()}.db`)

const { localStamp, insertUsageSample, usageTotals, usageDays, getSetting, setSetting, closeDb } =
  await import('./db.mjs')
const { parseNetstatE } = await import('./usage.mjs')

const NETSTAT = `
Interface Statistics

                           Received            Sent

Bytes                     175109568      2400500270
Unicast packets            41851452        31610388
`

test('parses netstat -e byte counters', () => {
  assert.deepEqual(parseNetstatE(NETSTAT), { rx: 175109568, tx: 2400500270 })
  assert.equal(parseNetstatE('Interface Statistics\n\nnothing here'), null)
})

test('sums samples into today and month totals', () => {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0)

  insertUsageSample(localStamp(now), 1000, 200)
  insertUsageSample(localStamp(now), 500, 100)
  insertUsageSample(localStamp(lastMonth), 9000, 9000)

  const today = usageTotals("substr(at, 1, 10) = date('now', 'localtime')")
  assert.deepEqual(today, { rx: 1500, tx: 300 })

  const month = usageTotals("substr(at, 1, 7) = strftime('%Y-%m', 'now', 'localtime')")
  assert.deepEqual(month, { rx: 1500, tx: 300 })

  const days = usageDays(40)
  assert.ok(days.length >= 2)
  const summed = days.reduce((total, day) => ({ rx: total.rx + day.rx, tx: total.tx + day.tx }), {
    rx: 0,
    tx: 0
  })
  assert.deepEqual(summed, { rx: 10500, tx: 9300 })
})

test('stores and reads settings as JSON', () => {
  assert.equal(getSetting('missing', 42), 42)
  setSetting('limit', 12.5)
  assert.equal(getSetting('limit', null), 12.5)
  setSetting('limit', null)
  assert.equal(getSetting('limit', 'fallback'), null)
})

test('cleans up the temporary database', () => {
  closeDb()
  rmSync(process.env.ARHLINX_DB, { force: true })
  assert.ok(true)
})
