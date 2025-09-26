/**
 * To prevent cyclic imports causing a call to a function that is not yet defined, we use this function to delay
 * the call until one of the returned properties are actually accessed.
 *
 * In the case of create*QueryContext(), the returned Provider and useCtx functions will end up depending
 * on components or code that again depend on the Provider and useCtx to be defined. If we just called the
 * real create*QueryContext() functions on the root, the function would be undefined at that point.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#cyclic_imports
 */
export function delayedContext<T>(callback: () => T): T {
  const realizedProps: Partial<T> = {};
  const proxyProps = {} as { [K in keyof T]: () => T[K] };

  function realize() {
    Object.assign(realizedProps, callback());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy({} as any, {
    get(_, prop) {
      if (prop in realizedProps) {
        return realizedProps[prop];
      }

      if (!(prop in proxyProps)) {
        proxyProps[prop] = (...props: unknown[]) => {
          if (!(prop in realizedProps)) {
            realize();
          }
          return realizedProps[prop](...props);
        };
      }

      return proxyProps[prop];
    },
  });
}
