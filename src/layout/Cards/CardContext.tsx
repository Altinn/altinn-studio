import React from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface CardContext {
  node: LayoutNode<'Cards'>;
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
