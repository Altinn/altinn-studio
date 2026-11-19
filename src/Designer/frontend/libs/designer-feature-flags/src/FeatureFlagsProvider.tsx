import React, { useCallback, useState } from 'react';
import type { FeatureFlag } from './FeatureFlag';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  retrieveFeatureFlags,
} from './utils';
import { FeatureFlagsContextProvider } from './FeatureFlagsContext';
import { FeatureFlagMutationContextProvider } from './FeatureFlagMutationContext';

export type FeatureFlagsProviderProps = { children: React.ReactNode };

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps): React.ReactElement {
  const [flags, setFlags] = useState<FeatureFlag[]>(retrieveFeatureFlags());

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
    <FeatureFlagMutationContextProvider value={{ addFlag, removeFlag }}>
      <FeatureFlagsContextProvider value={{ flags }}>{children}</FeatureFlagsContextProvider>
    </FeatureFlagMutationContextProvider>
  );
}
