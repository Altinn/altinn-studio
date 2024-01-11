import React, { useState } from 'react';

import { createContext } from 'src/core/contexts/context';

export type UiConfigContext = {
  /**
   * Keeps track of whether the UI is expanded or not.
   */
  expandedWidth: boolean;
  toggleExpandedWidth: () => void;
};

const { Provider, useCtx } = createContext<UiConfigContext>({
  name: 'UiConfigContext',
  required: false,
  default: {
    expandedWidth: false,
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
        toggleExpandedWidth: () => setExpandedWidth((prevState) => !prevState),
      }}
    >
      {children}
    </Provider>
  );
}

export const useUiConfigContext = () => useCtx();
