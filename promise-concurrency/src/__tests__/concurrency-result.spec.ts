import ava, { TestInterface } from 'ava'
import Sinon from 'sinon'

import { ConcurrencyResult } from '../concurrency-result'
import { defer } from '../defer'

const test = ava as TestInterface<{
  timer: Sinon.SinonFakeTimers
}>

test.beforeEach((t) => {
  t.context.timer = Sinon.useFakeTimers()
})

test.afterEach((t) => {
  t.context.timer.restore()
})

test('should be able to iterate by for..await', async (t) => {
  const result = new ConcurrencyResult<number>()

  const fixtures = [1, 2]
  for (const fixture of fixtures) {
    result.yield(fixture)
  }
  // 停止迭代，不是的话，就会一直 promise 等待在哪里
  result.done()
  let index = 0
  for await (const value of result) {
    t.is(value, fixtures[index])
    index++
  }
})

test('should be able to throw error', async (t) => {
  const result = new ConcurrencyResult<number>()
  const err = new TypeError('You bad bad')
  result.reject(err)
  try {
    // eslint-disable-next-line no-empty, no-unused-vars
    for await (const _ of result) {
    }
    // 永远不会到达这里
    throw new TypeError('Unreachable error')
  } catch (e) {
    t.is(e, err)
  }
})

test('should be able to wait the deferred value', (t) => {
  const result = new ConcurrencyResult<number>()
  const timeout = 1000

  // 异步任务
  setTimeout(() => {
    result.yield(1)
    result.done()
  }, timeout)

  const d = defer<void>()

  async function runSpec() {
    for await (const value of result) {
      t.is(value, 1)
    }
    // 计量时间
    d.resolve()
  }
  runSpec()

  t.context.timer.tick(timeout)

  return d.promise
})

test('should be able to reject when some value still deferred', (t) => {
  const result = new ConcurrencyResult<number>()
  const timeout = 1000

  const err = new TypeError('You bad bad')

  setTimeout(() => {
    result.reject(err)
  }, timeout)

  const d = defer<void>()

  async function runSpec() {
    try {
      // eslint-disable-next-line no-empty, no-unused-vars
      for await (const _ of result) {
      }
      throw new TypeError('Unreachable error')
    } catch (e) {
      d.reject(e)
    }
  }
  runSpec()

  t.context.timer.tick(timeout)

  return d.promise.catch((e) => {
    t.is(e, err)
  })
})
