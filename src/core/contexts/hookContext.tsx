import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

type HookContextProps = {
  [name: string]: () => unknown;
};

/**
 * This will store the result of any hook in a context and return a new hook for reading the context value.
 * Why is this useful? React always reruns hooks on render, and if the hook does expensive calculations and
 * is used a lot (e.g. for every node in the node generator), this will make things much faster,
 * as reading from a plain context is very cheap. It is also much cheaper than subscribing directly to
 * a zustand store. You shouldn't  bother storing the result of another simple context here, as it will
 * not be any faster.
 */
export function createHookContext<P extends HookContextProps>(
  props: P,
): {
  Provider: React.FC<PropsWithChildren>;
  hooks: P;
} {
  const data = Object.entries(props).map(([name, useHook]) => {
    const Context = createContext<unknown>(null as unknown);
    Context.displayName = name;
    const useCtx = () => useContext(Context);
    const Provider = ({ children }: PropsWithChildren) => {
      const value = useHook();
      return <Context.Provider value={value}>{children}</Context.Provider>;
    };
    return {
      name,
      useCtx,
      Provider,
    };
  });

  return {
    Provider: ({ children }: PropsWithChildren) => (
      <>
        {data.reduce(
          (innerProviders, { Provider }) => (
            <Provider>{innerProviders}</Provider>
          ),
          children,
        )}
      </>
    ),
    hooks: Object.fromEntries(data.map(({ name, useCtx }) => [name, useCtx])) as P,
  };
}
