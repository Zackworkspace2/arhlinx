import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.ARHLINX_DB = join(tmpdir(), `arhlinx-settings-${process.pid}-${Date.now()}.db`)

const {
  insertSpeedTest,
  listSpeedTests,
  insertUsageSample,
  usageTotals,
  clearSpeedTests,
  clearUsage,
  localStamp,
  closeDb
} = await import('./db.mjs')

test('clears only the requested dataset', () => {
  insertSpeedTest({
    at: new Date().toISOString(),
    downloadMbps: 10,
    uploadMbps: 5,
    pingMs: 20,
    jitterMs: 1,
    target: 'test'
  })
  insertUsageSample(localStamp(), 1000, 500)
  insertUsageSample(localStamp(), 1000, 500)
  assert.equal(listSpeedTests(5).length, 1)

  assert.equal(clearSpeedTests(), 1)
  assert.equal(listSpeedTests(5).length, 0)
  assert.deepEqual(usageTotals('1 = 1'), { rx: 2000, tx: 1000 })

  assert.equal(clearUsage(), 2)
  assert.deepEqual(usageTotals('1 = 1'), { rx: 0, tx: 0 })
})

test('clearing an empty database reports zero', () => {
  assert.equal(clearSpeedTests(), 0)
  assert.equal(clearUsage(), 0)
})

test('cleanup', () => {
  closeDb()
  rmSync(process.env.ARHLINX_DB, { force: true })
  assert.ok(true)
})
