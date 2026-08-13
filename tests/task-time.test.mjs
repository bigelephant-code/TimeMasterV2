import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const { normalizeTaskTime, taskStartTime, taskEndTime, taskEndsNextDay, taskRolloverEligible } = require('../src/main/task-time.js')

test('normalizeTaskTime accepts only trimmed 24-hour HH:MM values', () => {
  const cases = [
    ['00:00', '00:00'],
    ['09:05', '09:05'],
    ['23:59', '23:59'],
    [' 09:05 ', '09:05'],
    ['24:00', null],
    ['23:60', null],
    ['9:05', null],
    ['09:5', null],
    ['09:05:00', null],
    ['09：05', null],
    ['at 09:05', null],
    ['', null],
    ['   ', null],
    [null, null],
    [undefined, null],
    [0, null],
    [905, null],
    [true, null]
  ]

  for (const [value, expected] of cases) {
    assert.equal(normalizeTaskTime(value), expected, `Unexpected result for ${String(value)}`)
  }
})

test('taskEndTime preserves the legacy time fallback and endTime precedence', () => {
  const cases = [
    [{ time: '11:30' }, '11:30'],
    [{ endTime: undefined, time: '11:30' }, '11:30'],
    [{ endTime: '12:40', time: '11:30' }, '12:40'],
    [{ endTime: null, time: '11:30' }, null],
    [{ endTime: '', time: '11:30' }, null],
    [{ endTime: 'invalid', time: '11:30' }, null],
    [{}, null],
    [null, null]
  ]

  for (const [todo, expected] of cases) {
    assert.equal(taskEndTime(todo), expected, `Unexpected end time for ${JSON.stringify(todo)}`)
  }
})

test('taskStartTime and taskEndTime normalize common task combinations', () => {
  const cases = [
    [{}, [null, null]],
    [{ startTime: '08:00' }, ['08:00', null]],
    [{ endTime: '17:30' }, [null, '17:30']],
    [{ startTime: '08:00', endTime: '17:30' }, ['08:00', '17:30']],
    [{ startTime: '08:00', time: '17:30' }, ['08:00', '17:30']],
    [{ startTime: '8:00', endTime: '17:30' }, [null, '17:30']],
    [{ startTime: '08:00', endTime: '17:90' }, ['08:00', null]]
  ]

  for (const [todo, expected] of cases) {
    assert.deepEqual([taskStartTime(todo), taskEndTime(todo)], expected)
  }
})

test('cross-midnight tasks roll over only after their next-day end time', () => {
  const overnight = { date: '2026-08-12', startTime: '23:30', endTime: '00:30' }
  assert.equal(taskEndsNextDay(overnight), true)
  assert.equal(taskRolloverEligible(overnight, new Date(2026, 7, 13, 0, 0)), false)
  assert.equal(taskRolloverEligible(overnight, new Date(2026, 7, 13, 0, 29, 59)), false)
  assert.equal(taskRolloverEligible(overnight, new Date(2026, 7, 13, 0, 30)), true)
  assert.equal(taskRolloverEligible({ ...overnight, endTime: '23:45' }, new Date(2026, 7, 13, 0, 0)), true)
})
