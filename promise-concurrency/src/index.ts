import { ConcurrencyResult } from './concurrency-result'
import { defer } from './defer'

export type Task<T> = () => Promise<T>

export class PromiseConcurrencyController<T> {
  activeCount = 0
  pendingCount = 0

  private workers: IterableIterator<Task<T>>[]

  private result = new ConcurrencyResult<T>()
  private tasks: Task<T>[] = []
  private isPaused = false

  private defer = defer<void>()
  private controlPause = defer<void>()

  constructor(public readonly size: number) {
    // 创建一个对应大小的 workers 空数组
    this.workers = new Array(size)
  }

  private async do(item: Task<T>) {
    this.activeCount++
    const r = await item()
    this.activeCount--

    this.pendingCount--

    if (this.pendingCount === 0) {
      // 结束迭代
      this.result.done()
    }
    this.result.yield(r)
  }

  // ConcurrencyResult 就是查看结果的工具
  // 先完成只能调用一次 run
  run(...tasks: Task<T>[]): ConcurrencyResult<T> {
    if (!tasks.length) {
      throw new Error('need tasks')
    }

    this.pendingCount = this.pendingCount + tasks.length

    this.tasks = [...this.tasks, ...tasks]

    // 判断是不是第一次
    this.pendingCount === tasks.length &&
      // 因为调用 run 是同步的, 让他在下一个事件循环里面去搞, 就能拿到最后 run 的最终信息
      setTimeout(() => {
        // 填充为同一个 Iterator
        this.workers.fill(this.tasks.values())
        this.workers.forEach(async (i) => {
          // 每个 worker 都会去进行迭代，也就是并发
          for (const item of i) {
            try {
              if (!this.isPaused) {
                await this.do(item)
                // 有可能在 await 的过程中 this.isPaused 被修改了
                if (!this.activeCount && this.isPaused) {
                  this.defer.resolve()
                  await this.controlPause.promise
                }
              } else {
                await this.controlPause.promise
                // 需要重做被暂停的
                await this.do(item)
              }
            } catch (error) {
              if (!this.isPaused) {
                this.result.reject(error)
              } else {
                this.defer.resolve()
                // 等着再次唤醒
                await this.controlPause.promise
              }
            }
          }
        })
      }, 0)

    return this.result
  }

  async stop(): Promise<void> {
    this.isPaused = true
    return this.activeCount ? this.defer.promise : Promise.resolve()
  }

  resume() {
    this.isPaused = false
    this.controlPause.resolve()
    this.controlPause = defer<void>()
  }
}

// function sleep(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms))
// }

const a = new PromiseConcurrencyController<number>(2)

a.run(
  async () => {
    await sleep(1000)
    return 1
  },
  async () => {
    await sleep(1000)
    return 2
  },
  async () => {
    await sleep(1000)
    return 3
  },
  async () => {
    await sleep(1000)
    return 4
  },
  async () => {
    await sleep(1000)
    return 5
  },
  async () => {
    await sleep(1000)
    return 6
  }
)

const i1 = a.run(
  async () => {
    await sleep(1000)
    return 1
  },
  async () => {
    await sleep(1000)
    return 2
  },
  async () => {
    await sleep(1000)
    return 3
  },
  async () => {
    await sleep(1000)
    return 4
  },
  async () => {
    await sleep(1000)
    return 5
  },
  async () => {
    await sleep(1000)
    return 6
  }
)

// // 开始执行的时候并没有数据，然后直接就 done 了
// ;(async () => {
//   const size = 2
//   const controller = new PromiseConcurrencyController(size)
//   const tasks = Array.from({ length: 10 }, () => async () => {
//     await sleep(Math.random() * 100)
//   })
//   const a = controller.run(...tasks)
//   // eslint-disable-next-line no-unused-vars, no-empty
//   for await (const _ of a) {
//     console.log(controller.activeCount)
//   }
// })()

// setTimeout(async () => {
//   console.log('dd' + a.activeCount)
//   await a.stop()
//   console.log('dd' + a.activeCount)
// }, 1000)

// setTimeout(() => {
//   a.resume()
// }, 3000)
