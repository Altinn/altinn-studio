import React from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';

interface CardContext {
  baseComponentId: string;
  renderedInMedia: boolean;
  minMediaHeight?: string;
}

const { Provider, useCtx } = createContext<CardContext | undefined>({
  name: 'Card',
  required: false,
  default: undefined,
});

export function CardProvider({ children, ...state }: PropsWithChildren<CardContext>) {
  return <Provider value={state}>{children}</Provider>;
}

export const useParentCard = () => useCtx();
