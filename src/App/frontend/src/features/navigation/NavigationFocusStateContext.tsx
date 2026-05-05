import React from 'react';
import { useLocation } from 'react-router';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';

interface Context {
  getHandledNavigationKey: () => string;
  setHandledNavigationKey: (key: string) => void;
}

const { useCtx, Provider } = createContext<Context>({
  name: 'NavigationFocusState',
  required: true,
});

export function NavigationFocusStateProvider({ children }: PropsWithChildren) {
  const { key } = useLocation();

  // We don't want to move focus on first render, so we mark the current navigation key as handled.
  const handledNavigationKeyRef = React.useRef({ key });

  const getHandledNavigationKey = (): string => handledNavigationKeyRef.current.key;
  const setHandledNavigationKey = (key: string): void => {
    handledNavigationKeyRef.current.key = key;
  };

  return <Provider value={{ getHandledNavigationKey, setHandledNavigationKey }}>{children}</Provider>;
}
export const useHandledNavigationKey = (): string => useCtx().getHandledNavigationKey();
export const useSetHandledNavigationKey = (): ((key: string) => void) => useCtx().setHandledNavigationKey;
