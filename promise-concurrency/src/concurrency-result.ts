import { Defer, defer } from './defer'

// 执行完了再读取 (同步)
// 先读取了再执行 (异步)
export class ConcurrencyResult<T> implements AsyncIterator<T, void, void> {
  private readonly values: T[] = []
  private readonly defersQueue: Defer<T>[] = []
  private rejectReason: unknown | null = null

  private isDone = false

  // 停止迭代的标志
  done() {
    this.isDone = true
  }

  reject(e: unknown) {
    if (this.defersQueue.length) {
      this.defersQueue.shift()!.reject(e)
    } else {
      this.rejectReason = e
    }
  }

  // 装入数据
  yield(value: T) {
    if (this.defersQueue.length) {
      this.defersQueue.shift()!.resolve(value)
    } else {
      // 同步按照顺序很好保证
      this.values.push(value)
    }
  }

  async next() {
    if (this.rejectReason) {
      throw this.rejectReason
    }

    // 迭代完成
    if (this.isDone && !this.values.length && !this.defersQueue.length) {
      return {
        done: true as const,
        // eslint-disable-next-line no-void
        value: void 0,
      }
    }
    // 简单来看: 已经执行完毕了，再进行读取，同步输出
    if (this.values.length) {
      return {
        done: false as const,
        value: this.values.shift()!,
      }
    }
    // 如果没有数据就暂停 for await 等待 yield 出来数据
    const d = defer<T>()
    this.defersQueue.push(d)
    const value = await d.promise

    return {
      done: false as const,
      value,
    }
  }

  [Symbol.asyncIterator] = () => {
    return this
  }
}
