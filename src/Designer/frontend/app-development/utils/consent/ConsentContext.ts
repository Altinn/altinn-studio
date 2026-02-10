import type { Context } from 'react';
import { createContext, useContext } from 'react';
import type { ConsentState } from './types';

export type ConsentContextValue = {
  consentState: ConsentState | null;
  hasAnalyticsConsent: boolean;
  hasSessionRecordingConsent: boolean;
  hasDecision: boolean;
};

const NullableConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const context = useContext<ConsentContextValue | null>(NullableConsentContext);
  if (context === null) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}

const ConsentContext = NullableConsentContext as Context<ConsentContextValue>;
export const ConsentContextProvider = ConsentContext.Provider;
