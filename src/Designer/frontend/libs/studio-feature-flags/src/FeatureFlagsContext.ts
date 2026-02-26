import type { Context } from 'react';
import { createContext, useContext } from 'react';
import type { FeatureFlag } from './FeatureFlag';

export type FeatureFlagsContextValue = {
  flags: FeatureFlag[];
};

const NullableFeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function useFeatureFlagsContext(): FeatureFlagsContextValue {
  const context = useContext<FeatureFlagsContextValue | null>(NullableFeatureFlagsContext);
  if (context === null) {
    throw new Error('useFeatureFlagsContext must be used within a FeatureFlagsContext.Provider');
  }
  return context;
}

const FeatureFlagsContext = NullableFeatureFlagsContext as Context<FeatureFlagsContextValue>;
export const FeatureFlagsContextProvider = FeatureFlagsContext.Provider;
