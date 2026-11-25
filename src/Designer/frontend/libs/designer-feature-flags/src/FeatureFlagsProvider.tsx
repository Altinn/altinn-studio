import React, { useCallback, useState } from 'react';
import type { FeatureFlag } from './FeatureFlag';
import type { ExperimentalFeaturesMode } from './utils';
import {
  addFeatureFlagToLocalStorage,
  retrieveExperimentalFeaturesMode,
  retrieveFeatureFlags,
  setExperimentalFeaturesModeInLocalStorage,
  turnOffFeatureFlag,
} from './utils';
import { FeatureFlagsContextProvider } from './FeatureFlagsContext';
import { FeatureFlagMutationContextProvider } from './FeatureFlagMutationContext';
import { ExperimentalFeaturesModeContextProvider } from './ExperimentalFeaturesModeContext';

export type FeatureFlagsProviderProps = { children: React.ReactNode };

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps): React.ReactElement {
  const [flags, setFlags] = useState<FeatureFlag[]>(retrieveFeatureFlags());
  const [mode, setModeState] = useState<ExperimentalFeaturesMode>(
    retrieveExperimentalFeaturesMode(),
  );

  const updateState = useCallback(() => {
    setFlags(retrieveFeatureFlags());
    setModeState(retrieveExperimentalFeaturesMode());
  }, [setFlags, setModeState]);

  const addFlag = useCallback(
    (flag: FeatureFlag) => {
      addFeatureFlagToLocalStorage(flag);
      updateState();
    },
    [updateState],
  );

  const removeFlag = useCallback(
    (flag: FeatureFlag) => {
      turnOffFeatureFlag(flag);
      updateState();
    },
    [updateState],
  );

  const setMode = useCallback(
    (newMode: ExperimentalFeaturesMode) => {
      setExperimentalFeaturesModeInLocalStorage(newMode);
      updateState();
    },
    [updateState],
  );

  return (
    <ExperimentalFeaturesModeContextProvider value={{ mode, setMode }}>
      <FeatureFlagMutationContextProvider value={{ addFlag, removeFlag }}>
        <FeatureFlagsContextProvider value={{ flags }}>{children}</FeatureFlagsContextProvider>
      </FeatureFlagMutationContextProvider>
    </ExperimentalFeaturesModeContextProvider>
  );
}
