import type { PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useState } from 'react';
import type { FeatureFlag } from './FeatureFlag';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  retrieveFeatureFlags,
} from './utils';

export type FeatureFlagsContextValue = {
  flags: FeatureFlag[];
  addFlag: (flag: FeatureFlag) => void;
  removeFlag: (flag: FeatureFlag) => void;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function useFeatureFlagsContext(): FeatureFlagsContextValue {
  const context = useContext<FeatureFlagsContextValue | null>(FeatureFlagsContext);
  if (context === null) {
    throw new Error('useFeatureFlagsContext must be used within a FeatureFlagsProvider');
  }
  return context;
}

export type FeatureFlagsProviderProps = PropsWithChildren<{ flags?: FeatureFlag[] }>;

export function FeatureFlagsProvider({
  children,
  flags: defaultFlags = retrieveFeatureFlags(),
}: FeatureFlagsProviderProps): React.ReactElement {
  const [flags, setFlags] = useState<FeatureFlag[]>(defaultFlags);

  const updateFlags = useCallback(() => {
    setFlags(retrieveFeatureFlags());
  }, [setFlags]);

  const addFlag = useCallback(
    (flag: FeatureFlag) => {
      addFeatureFlagToLocalStorage(flag);
      updateFlags();
    },
    [updateFlags],
  );

  const removeFlag = useCallback(
    (flag: FeatureFlag) => {
      removeFeatureFlagFromLocalStorage(flag);
      updateFlags();
    },
    [updateFlags],
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, addFlag, removeFlag }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}
