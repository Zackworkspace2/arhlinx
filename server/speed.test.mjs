import { test } from 'node:test'
import assert from 'node:assert/strict'
import { average, computeJitter, computeMbps } from './speedtest.mjs'

test('converts bytes and seconds to Mbps', () => {
  assert.equal(computeMbps(12_500_000, 1), 100)
  assert.equal(computeMbps(1_000_000, 8), 1)
})

test('returns zero for invalid measurements', () => {
  assert.equal(computeMbps(0, 1), 0)
  assert.equal(computeMbps(1000, 0), 0)
  assert.equal(computeMbps(Number.NaN, 1), 0)
})

test('computes jitter as mean absolute difference between samples', () => {
  assert.equal(computeJitter([10, 12, 11, 15]), 2.33)
  assert.equal(computeJitter([20]), 0)
  assert.equal(computeJitter([]), 0)
})

test('averages ping samples', () => {
  assert.equal(average([10, 20, 30]), 20)
  assert.equal(average([]), 0)
})
