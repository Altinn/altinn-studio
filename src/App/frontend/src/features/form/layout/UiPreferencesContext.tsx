import React, { useState } from 'react';

import { createContext } from 'src/core/contexts/context';

/**
 * Choices the user made about how the app presents itself, as opposed to the presentation an app
 * configures for itself in Settings.json and its layouts. Provided above the routes so they survive
 * navigation. Not persisted to storage, so it last until the page is reloaded.
 */
export type UiPreferences = {
  userPrefersExpandedWidth: boolean | undefined;
  setUserPrefersExpandedWidth: (expandedWidth: boolean) => void;
};

const { Provider, useCtx } = createContext<UiPreferences>({
  name: 'UiPreferences',
  required: false,
  default: {
    userPrefersExpandedWidth: undefined,
    setUserPrefersExpandedWidth: () => {
      throw new Error('UiPreferences not initialized. setUserPrefersExpandedWidth cannot be called');
    },
  },
});

export function UiPreferencesProvider({ children }: React.PropsWithChildren) {
  const [userPrefersExpandedWidth, setUserPrefersExpandedWidth] = useState<boolean | undefined>(undefined);

  return (
    <Provider
      value={{
        userPrefersExpandedWidth,
        setUserPrefersExpandedWidth,
      }}
    >
      {children}
    </Provider>
  );
}

export const useUiPreferences = () => useCtx();
