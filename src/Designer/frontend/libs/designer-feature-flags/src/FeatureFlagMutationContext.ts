import type { Context } from 'react';
import { createContext, useContext } from 'react';
import type { FeatureFlag } from './FeatureFlag';

export type FeatureFlagMutationContextValue = {
  addFlag: (flag: FeatureFlag) => void;
  removeFlag: (flag: FeatureFlag) => void;
};

const NullableFeatureFlagMutationContext = createContext<FeatureFlagMutationContextValue | null>(
  null,
);

export function useFeatureFlagMutationContext(): FeatureFlagMutationContextValue {
  const context = useContext<FeatureFlagMutationContextValue | null>(
    NullableFeatureFlagMutationContext,
  );
  if (context === null) {
    throw new Error(
      'useFeatureFlagMutationContext must be used within a FeatureFlagMutationContextProvider',
    );
  }
  return context;
}

const FeatureFlagMutationContext =
  NullableFeatureFlagMutationContext as Context<FeatureFlagMutationContextValue>;
export const FeatureFlagMutationContextProvider = FeatureFlagMutationContext.Provider;
