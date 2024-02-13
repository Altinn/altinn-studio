import React, { useState } from 'react';

import { createContext } from 'src/core/contexts/context';

export type UiConfigContext = {
  /**
   * Keeps track of whether the UI is expanded or not.
   */
  expandedWidth: boolean;
  setExpandedWidth: (expandedWidth: boolean) => void;
  toggleExpandedWidth: () => void;
};

const { Provider, useCtx } = createContext<UiConfigContext>({
  name: 'UiConfigContext',
  required: false,
  default: {
    expandedWidth: false,
    setExpandedWidth: () => {
      throw new Error('UiConfigContext not initialized. setExpandedWidth cannot be called');
    },
    toggleExpandedWidth: () => {
      throw new Error('UiConfigContext not initialized. toggleExpandedWidth cannot be called');
    },
  },
});

export function UiConfigProvider({ children }: React.PropsWithChildren) {
  const [expandedWidth, setExpandedWidth] = useState<boolean>(false);

  return (
    <Provider
      value={{
        expandedWidth,
        setExpandedWidth,
        toggleExpandedWidth: () => setExpandedWidth((prevState) => !prevState),
      }}
    >
      {children}
    </Provider>
  );
}

export const useUiConfigContext = () => useCtx();
