import React, { useCallback, useMemo, useState } from 'react';

import { createStore } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useHiddenLayoutsExpressions } from 'src/features/form/layout/LayoutsContext';
import { useCurrentView, useOrder } from 'src/hooks/useNavigatePage';
import { useResolvedNode } from 'src/utils/layout/NodesContext';
import type { PageNavigationConfig } from 'src/features/expressions/ExprContext';
import type { CompSummaryExternal } from 'src/layout/Summary/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type PageNavigationContext = {
  /**
   * Keeps track of which view to return to when the user has navigated
   * with the summary component buttons.
   */
  returnToView?: string;
  setReturnToView: (returnToView?: string) => void;

  /**
   * Keeps track of which pages are hidden by expressions.
   */
  hidden: Set<string>;
  setHiddenPages: (hidden: Set<string>) => void;

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
    hidden: new Set(),
    setHiddenPages: (hidden) => set({ hidden }),
    summaryNodeOfOrigin: undefined,
    setSummaryNodeOfOrigin: (summaryNodeOfOrigin) => set({ summaryNodeOfOrigin }),
  }));
}

const { Provider, useLaxSelector, useLaxSelectorAsRef } = createZustandContext({
  name: 'PageNavigationContext',
  required: true,
  initialCreateStore,
});

export function PageNavigationProvider({ children }: React.PropsWithChildren) {
  const [returnToView, setReturnToView] = useState<string>();
  const [hidden, setHidden] = useState<string[]>([]);

  return (
    <Provider
      value={{
        returnToView,
        setReturnToView,
        hidden,
        setHiddenPages: setHidden,
      }}
    >
      {children}
    </Provider>
  );
}

export const usePageNavigationConfig = (): PageNavigationConfig => {
  const currentView = useCurrentView();
  const hiddenExpr = useHiddenLayoutsExpressions();
  const isHiddenPage = useIsHiddenPage();
  const order = useOrder();

  return useMemo(
    () => ({
      currentView,
      isHiddenPage,
      hiddenExpr,
      order,
    }),
    [currentView, isHiddenPage, hiddenExpr, order],
  );
};

const emptySet = new Set<string>();
export const useHiddenPages = () => {
  const hidden = useLaxSelector((ctx) => ctx.hidden);
  return hidden === ContextNotProvided ? emptySet : hidden;
};

export const useIsHiddenPage = () => {
  const hidden = useLaxSelectorAsRef((state) => state.hidden);
  return useCallback(
    (pageId: string) => {
      const current = hidden.current;
      return current === ContextNotProvided ? false : current.has(pageId);
    },
    [hidden],
  );
};

export const useSetHiddenPages = () => {
  const func = useLaxSelector((ctx) => ctx.setHiddenPages);
  return func === ContextNotProvided ? undefined : func;
};

export const useReturnToView = () => {
  const returnToView = useLaxSelector((ctx) => ctx.returnToView);
  return returnToView === ContextNotProvided ? undefined : returnToView;
};

export const useSetReturnToView = () => {
  const func = useLaxSelector((ctx) => ctx.setReturnToView);
  return func === ContextNotProvided ? undefined : func;
};

export const useSummaryNodeOfOrigin = (): LayoutNode<'Summary'> | undefined => {
  const func = useLaxSelector((ctx) => ctx.summaryNodeOfOrigin);
  const node = useResolvedNode<CompSummaryExternal>(func === ContextNotProvided ? undefined : func);
  return func === ContextNotProvided ? undefined : node;
};

export const useSetSummaryNodeOfOrigin = () => {
  const func = useLaxSelector((ctx) => ctx.setSummaryNodeOfOrigin);
  return func === ContextNotProvided ? undefined : func;
};
