import React, { useState } from 'react';

import { ContextNotProvided, createContext } from 'src/core/contexts/context';
import type { IComponentScrollPos } from 'src/features/form/layout/formLayoutTypes';
import type { IHiddenLayoutsExternal } from 'src/types';

export type PageNavigationContext = {
  /**
   * Keeps track of which view to return to when the user has navigated
   * with the summary component buttons.
   */
  returnToView?: string;
  setReturnToView: React.Dispatch<React.SetStateAction<string | undefined>>;

  /**
   * Keeps track of scroll position to be able to scroll the page to the
   * next-button when navigation is stopped by validation errors, and the
   * page height changes as a result of displaying those validation errors.
   */
  scrollPosition?: IComponentScrollPos | undefined;
  setScrollPosition: React.Dispatch<React.SetStateAction<IComponentScrollPos | undefined>>;

  /**
   * Keeps track of which pages are hidden by expressions.
   */
  hidden: string[];
  setHiddenPages: React.Dispatch<React.SetStateAction<string[]>>;

  /**
   * Keeps track of the hidden expressions for each page.
   */
  hiddenExpr: IHiddenLayoutsExternal;
  setHiddenExpr: React.Dispatch<React.SetStateAction<IHiddenLayoutsExternal>>;
};

const { Provider, useCtx, useLaxCtx } = createContext<PageNavigationContext>({
  name: 'PageNavigationContext',
  required: true,
});

export function PageNavigationProvider({ children }: React.PropsWithChildren) {
  const [returnToView, setReturnToView] = useState<string>();
  const [scrollPosition, setScrollPosition] = useState<IComponentScrollPos | undefined>();
  const [hidden, setHidden] = useState<string[]>([]);
  const [hiddenExpr, setHiddenExpr] = useState<IHiddenLayoutsExternal>({});

  return (
    <Provider
      value={{
        returnToView,
        setReturnToView,
        scrollPosition,
        setScrollPosition,
        hidden,
        setHiddenPages: setHidden,
        setHiddenExpr,
        hiddenExpr,
      }}
    >
      {children}
    </Provider>
  );
}

export const usePageNavigationContext = () => useCtx();
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
    return undefined;
  }

  return ctx.returnToView;
};
