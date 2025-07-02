import React, { useState } from 'react';

import { createStore } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useNode } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type PageNavigationContext = {
  /**
   * Keeps track of which view to return to when the user has navigated
   * with the summary component buttons.
   */
  returnToView?: string;
  setReturnToView: (returnToView?: string) => void;

  /**
   * Keeps track of which Summary component the user navigated from.
   */
  summaryNodeOfOrigin?: string;
  setSummaryNodeOfOrigin: (componentOrigin?: string) => void;
};

function initialCreateStore() {
  return createStore<PageNavigationContext>((set) => ({
    returnToView: undefined,
    setReturnToView: (returnToView) => set({ returnToView }),
    summaryNodeOfOrigin: undefined,
    setSummaryNodeOfOrigin: (summaryNodeOfOrigin) => set({ summaryNodeOfOrigin }),
  }));
}

const { Provider, useLaxSelector } = createZustandContext({
  name: 'PageNavigationContext',
  required: true,
  initialCreateStore,
});

export function PageNavigationProvider({ children }: React.PropsWithChildren) {
  const [returnToView, setReturnToView] = useState<string>();

  return (
    <Provider
      value={{
        returnToView,
        setReturnToView,
      }}
    >
      {children}
    </Provider>
  );
}

export const useReturnToView = () => {
  const returnToView = useLaxSelector((ctx) => ctx.returnToView);
  return returnToView === ContextNotProvided ? undefined : returnToView;
};

export const useSetReturnToView = () => {
  const func = useLaxSelector((ctx) => ctx.setReturnToView);
  return func === ContextNotProvided ? undefined : func;
};

export const useSummaryNodeOfOrigin = (): LayoutNode | undefined => {
  const func = useLaxSelector((ctx) => ctx.summaryNodeOfOrigin);
  const node = useNode(func === ContextNotProvided ? undefined : func);
  return func === ContextNotProvided ? undefined : (node as LayoutNode);
};

export const useSetSummaryNodeOfOrigin = () => {
  const func = useLaxSelector((ctx) => ctx.setSummaryNodeOfOrigin);
  return func === ContextNotProvided ? undefined : func;
};
