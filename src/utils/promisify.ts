/**
 * Turn a function into a promise and postpone
 * resolving the promise until the next tick.
 * @param fn
 */
export function promisify<Fn extends (...args: unknown[]) => ReturnType<Fn>>(fn: Fn) {
  return (...arg: Parameters<Fn>) =>
    new Promise<void>((resolve) => {
      fn(...arg);
      setTimeout(resolve, 0);
    });
}
