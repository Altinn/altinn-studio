import React, { useEffect, useState } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useHiddenLayoutsExpressions } from 'src/features/form/layout/LayoutsContext';
import { usePageNavigationContext } from 'src/features/form/layout/PageNavigationContext';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';

export type UiConfigContext = {
  hideCloseButton: boolean;
  showLanguageSelector: boolean;
  showExpandWidthButton: boolean;
  showProgress: boolean;

  /**
   * Keeps track of whether the UI is expanded or not.
   */
  expandedWidth: boolean;
  toggleExpandedWidth: () => void;

  /**
   * Keeps track of the order of the pages before hidden pages are removed.
   */
  orderWithHidden: string[];
};

const { Provider, useCtx } = createContext<UiConfigContext>({
  name: 'UiConfigContext',
  required: false,
  default: {
    orderWithHidden: [],
    hideCloseButton: false,
    showLanguageSelector: false,
    showProgress: false,
    showExpandWidthButton: false,
    expandedWidth: false,
    toggleExpandedWidth: () => {
      throw Error('UiConfigContext not initialized. toggleExpandedWidth cannot be called');
    },
  },
});

export function UiConfigProvider({ children }: React.PropsWithChildren) {
  const layoutSettings = useLayoutSettings();
  const [expandedWidth, setExpandedWidth] = useState<boolean>(false);
  const { setHiddenExpr } = usePageNavigationContext();

  const hiddenExpressions = useHiddenLayoutsExpressions();

  useEffect(() => {
    setHiddenExpr(hiddenExpressions);
  }, [setHiddenExpr, hiddenExpressions]);

  return (
    <Provider
      value={{
        hideCloseButton: layoutSettings?.pages?.hideCloseButton ?? false,
        showLanguageSelector: layoutSettings?.pages?.showLanguageSelector ?? false,
        showExpandWidthButton: layoutSettings?.pages?.showExpandWidthButton ?? false,
        showProgress: layoutSettings?.pages?.showProgress ?? false,
        expandedWidth,
        orderWithHidden: layoutSettings?.pages?.order,
        toggleExpandedWidth: () => setExpandedWidth((prevState) => !prevState),
      }}
    >
      {children}
    </Provider>
  );
}

export const useUiConfigContext = () => useCtx();
