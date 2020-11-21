export interface Defer<T> {
  resolve: (value?: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
  promise: Promise<T>
}

export function defer<T>(): Defer<T> {
  let resolve: Defer<T>['resolve']
  let reject: Defer<T>['reject']
  // eslint-disable-next-line promise/param-names
  const promise = new Promise<T>((res, rej) => {
    // @ts-ignore
    resolve = res
    reject = rej
  })
  return { resolve: resolve!, reject: reject!, promise }
}
