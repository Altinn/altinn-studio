import type { Context } from 'react';
import { createContext, useContext } from 'react';
import type { ConsentPreferences } from './types';

export type ConsentMutationContextValue = {
  grantAllConsent: () => void;
  grantAnalyticsOnly: () => void;
  denyAllConsent: () => void;
  setConsentPreferences: (preferences: ConsentPreferences) => void;
};

const NullableConsentMutationContext = createContext<ConsentMutationContextValue | null>(null);

export function useConsentMutationContext(): ConsentMutationContextValue {
  const context = useContext<ConsentMutationContextValue | null>(NullableConsentMutationContext);
  if (context === null) {
    throw new Error('useConsentMutationContext must be used within a ConsentProvider');
  }
  return context;
}

const ConsentMutationContext =
  NullableConsentMutationContext as Context<ConsentMutationContextValue>;
export const ConsentMutationContextProvider = ConsentMutationContext.Provider;
