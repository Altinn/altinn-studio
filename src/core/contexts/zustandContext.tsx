import React, { useRef } from 'react';
import type { PropsWithChildren } from 'react';

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

  function useSelector<U>(selector: (state: Type) => U) {
    return useStore(useCtx(), selector);
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
    useLaxSelector,
    useHasProvider,
  };
}
