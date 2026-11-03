import type { Context } from 'react';
import { createContext, useContext } from 'react';
import type { ExperimentalFeaturesMode } from './utils';

export type ExperimentalFeaturesModeContextValue = {
  mode: ExperimentalFeaturesMode;
  setMode: (mode: ExperimentalFeaturesMode) => void;
};

const NullableExperimentalFeaturesModeContext =
  createContext<ExperimentalFeaturesModeContextValue | null>(null);

export function useExperimentalFeaturesMode(): ExperimentalFeaturesModeContextValue {
  const context = useContext<ExperimentalFeaturesModeContextValue | null>(
    NullableExperimentalFeaturesModeContext,
  );
  if (context === null) {
    throw new Error(
      'useExperimentalFeaturesMode must be used within an ExperimentalFeaturesModeContextProvider',
    );
  }
  return context;
}

const ExperimentalFeaturesModeContext =
  NullableExperimentalFeaturesModeContext as Context<ExperimentalFeaturesModeContextValue>;
export const ExperimentalFeaturesModeContextProvider = ExperimentalFeaturesModeContext.Provider;
