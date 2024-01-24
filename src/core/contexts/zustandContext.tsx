import React, { useRef } from 'react';
import type { PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';
import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import type { CreateContextProps } from 'src/core/contexts/context';

type ExtractFromStoreApi<T> = T extends StoreApi<infer U> ? Exclude<U, void> : never;

const dummyStore = createStore(() => ({}));

export function createZustandContext<Store extends StoreApi<Type>, Type = ExtractFromStoreApi<Store>, Props = any>(
  props: CreateContextProps<Store> & {
    initialCreateStore: (props: Props) => Store;
  },
) {
  const { initialCreateStore, ...rest } = props;
  const { Provider, useCtx, useLaxCtx, useHasProvider } = createContext<Store>(rest);

  /**
   * A hook that can be used to select values from the store. The selector function will be called whenever the store
   * changes, and the component will re-render if the selected value changes when compared with the previous value.
   */
  function useSelector<U>(selector: (state: Type) => U) {
    return useStore(useCtx(), selector);
  }

  /**
   * Same as useSelector, but can be used to select complex values, such as objects or arrays, and will only trigger
   * a re-render if the selected value changes when compared with the previous value. Values are compared using
   * 'fast-deep-equal'.
   */
  function useMemoSelector<U>(selector: (state: Type) => U) {
    const prev = useRef<U | undefined>(undefined);
    return useSelector((state) => {
      const next = selector(state);
      if (deepEqual(next, prev.current)) {
        return prev.current;
      }
      prev.current = next;
      return next;
    });
  }

  function useLaxSelector<U>(_selector: (state: Type) => U | typeof ContextNotProvided): U | typeof ContextNotProvided {
    const _store = useLaxCtx();
    const store = _store === ContextNotProvided ? dummyStore : _store;
    const selector = _store === ContextNotProvided ? () => ContextNotProvided : _selector;
    return useStore(store as any, selector as any);
  }

  function MyProvider({ children, ...props }: PropsWithChildren<Props>) {
    const storeRef = useRef<Store>();
    if (!storeRef.current) {
      storeRef.current = initialCreateStore(props as Props);
    }
    return <Provider value={storeRef.current}>{children}</Provider>;
  }

  return {
    Provider: MyProvider,
    useSelector,
    useMemoSelector,
    useLaxSelector,
    useHasProvider,
    useStore: useCtx,
    useLaxStore: useLaxCtx,
  };
}
