import React from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';

export type NavigationEffect = {
  targetLocation: string;
  matchStart?: boolean;
  callback: () => void;
};

interface Context {
  effect: NavigationEffect | null;
  setEffect: (effect: NavigationEffect) => void;
}

const { useCtx, Provider } = createContext<Context>({
  name: 'NavigationEffect',
  required: true,
});

export function NavigationEffectProvider({ children }: PropsWithChildren) {
  const [effect, setEffect] = React.useState<Context['effect']>(null);
  return <Provider value={{ effect, setEffect }}>{children}</Provider>;
}
export const useNavigationEffect = () => useCtx().effect;
export const useSetNavigationEffect = () => useCtx().setEffect;
