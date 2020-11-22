import ava from 'ava'

import { PromiseConcurrencyController } from '../index'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const test = ava

test('should be able to handle random concurrency and run can call many times', async (t) => {
  const size = Math.floor(Math.random() * 100)
  const length = Math.floor(Math.random() * 1000)

  const controller = new PromiseConcurrencyController(size)
  const tasks = Array.from({ length }, () => async () => {
    await sleep(10)
  })

  controller.run(...tasks)
  const result = controller.run(...tasks)

  // eslint-disable-next-line no-unused-vars
  for await (const _ of result) {
    t.true(controller.activeCount <= size)
  }
})

test('can stop and resume', async (t) => {
  const size = Math.floor(Math.random() * 100)
  const length = Math.floor(Math.random() * 10000)

  const controller = new PromiseConcurrencyController(size)
  const tasks = Array.from({ length }, () => async () => {
    await sleep(10)
  })
  const result = controller.run(...tasks)

  async function runSpec() {
    // eslint-disable-next-line no-unused-vars
    for await (const _ of result) {
      //
    }
  }

  runSpec()

  await sleep(12)

  await controller.stop()

  t.is(controller.activeCount, 0)

  controller.resume()

  await sleep(24)

  t.is(controller.activeCount, size)
})

test('can catch error', async (t) => {
  const controller = new PromiseConcurrencyController(2)
  const err = new TypeError('You bad bad')
  const result = controller.run(
    async () => {
      await sleep(1000)
    },
    async () => {
      await sleep(1000)
      throw err
    },
    async () => {
      await sleep(1000)
    },
    async () => {
      await sleep(1000)
    }
  )
  async function runSpec() {
    // eslint-disable-next-line no-unused-vars
    for await (const _ of result) {
      //
    }
  }

  try {
    await runSpec()
  } catch (error) {
    t.is(error, err)
  }
})
