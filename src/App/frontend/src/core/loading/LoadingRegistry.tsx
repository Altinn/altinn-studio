import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { createStore } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';
import { Loader } from 'src/core/loading/Loader';

/**
 * The loading registry is used to keep track of what is loading in the application. By registering a key and a value
 * in this registry, multiple providers can do what they need to do without having to individually block rendering
 * until they are done. When all registered keys are done loading, the form can be rendered.
 */
interface Context {
  loadingStates: {
    [key: string]: boolean;
  };
  setLoadingState(key: string, value: boolean): void;
}

function initialCreateStore() {
  return createStore<Context>((set) => ({
    loadingStates: {},
    setLoadingState: (key, value) => set((state) => ({ loadingStates: { ...state.loadingStates, [key]: value } })),
  }));
}

const { Provider, useShallowSelector, useStaticSelector, useHasProvider } = createZustandContext({
  name: 'LoadingRegistry',
  required: true,
  initialCreateStore,
});

export function LoadingRegistryProvider({ children }: PropsWithChildren) {
  return <Provider>{children}</Provider>;
}

export function BlockUntilAllLoaded({ children }: PropsWithChildren) {
  const loadingStates = useShallowSelector((state) => {
    const out: string[] = [];
    for (const key in state.loadingStates) {
      if (state.loadingStates[key]) {
        out.push(key);
      }
    }
    return out;
  });

  if (loadingStates.length > 0) {
    return (
      <Loader
        reason='loading-registry'
        details={loadingStates.join(', ')}
      />
    );
  }

  return children;
}

/**
 * Mark something as loading (true) or done loading (false) in the loading registry. When all items are done loading,
 * the form can be rendered.
 */
export function useMarkAsLoading(key: (string | number)[], value: boolean) {
  const hasProvider = useHasProvider();
  if (!hasProvider) {
    throw new Error(
      'useMarkAsLoading must be used within a LoadingRegistryProvider (currently only supported inside a FormProvider)',
    );
  }

  const keyStr = key.join('/');
  const setLoadingState = useStaticSelector((state) => state.setLoadingState);

  useEffect(() => {
    setLoadingState(keyStr, value);
  }, [value, keyStr, setLoadingState]);
}
