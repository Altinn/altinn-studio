import React, { useMemo, useState } from 'react';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import { useHiddenLayoutsExpressions } from 'src/features/form/layout/LayoutsContext';
import { useCurrentView, useOrder } from 'src/hooks/useNavigatePage';
import type { PageNavigationConfig } from 'src/features/expressions/ExprContext';

export type PageNavigationContext = {
  /**
   * Keeps track of which view to return to when the user has navigated
   * with the summary component buttons.
   */
  returnToView?: string;
  setReturnToView: React.Dispatch<React.SetStateAction<string | undefined>>;

  /**
   * Keeps track of which pages are hidden by expressions.
   */
  hidden: string[];
  setHiddenPages: React.Dispatch<React.SetStateAction<string[]>>;
};

const { Provider, useCtx, useLaxCtx } = createContext<PageNavigationContext>({
  name: 'PageNavigationContext',
  required: true,
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

export const usePageNavigationContext = () => useCtx();
export const usePageNavigationConfig = (): PageNavigationConfig => {
  const currentView = useCurrentView();
  const hiddenExpr = useHiddenLayoutsExpressions();
  const { hidden } = usePageNavigationContext();
  const order = useOrder();

  return useMemo(
    () => ({
      currentView,
      hidden,
      hiddenExpr,
      order,
    }),
    [currentView, hidden, hiddenExpr, order],
  );
};
export const useHiddenPages = () => {
  const ctx = useLaxCtx();
  if (ctx === ContextNotProvided) {
    return [];
  }

  return ctx.hidden;
};
export const useReturnToView = () => {
  const ctx = useLaxCtx();
  if (ctx === ContextNotProvided) {
    return {};
  }

  return { returnToView: ctx.returnToView, setReturnToView: ctx.setReturnToView };
};
