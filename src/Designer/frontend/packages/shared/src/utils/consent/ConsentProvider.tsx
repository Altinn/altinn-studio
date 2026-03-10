import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { usePostHog } from '@posthog/react';
import { CookieStorage } from '@studio/browser-storage';
import type { ConsentState, ConsentPreferences, StoredConsentState } from './types';
import { ConsentContextProvider } from './ConsentContext';
import { ConsentMutationContextProvider } from './ConsentMutationContext';
import { PostHogAnalyticsProvider } from './analyticsProvider';
import type { AnalyticsProvider } from './analyticsProvider';

export const CONSENT_COOKIE_KEY = 'altinn-studio-consent';

function isValidConsentState(stored: StoredConsentState | null): stored is ConsentState {
  return (
    stored !== null &&
    typeof stored.timestamp === 'number' &&
    typeof stored.preferences?.analytics === 'boolean' &&
    typeof stored.preferences?.sessionRecording === 'boolean'
  );
}

function getStoredConsentState(): ConsentState | null {
  try {
    const stored = CookieStorage.getItem<StoredConsentState>(CONSENT_COOKIE_KEY);
    return isValidConsentState(stored) ? stored : null;
  } catch {
    return null;
  }
}
export const CONSENT_COOKIE_EXPIRY_DAYS = 365;

export type ConsentProviderProps = {
  children: ReactNode;
  analyticsProvider?: AnalyticsProvider;
  getCurrentTimestamp?: () => number;
};

export function ConsentProvider({
  children,
  analyticsProvider,
  getCurrentTimestamp = Date.now,
}: ConsentProviderProps): ReactElement {
  const posthog = usePostHog();
  const [consentState, setConsentState] = useState<ConsentState | null>(getStoredConsentState);

  const provider = useMemo(
    () => analyticsProvider ?? new PostHogAnalyticsProvider(posthog),
    [analyticsProvider, posthog],
  );

  useEffect(() => {
    if (!consentState) return;

    try {
      provider.syncConsent(consentState.preferences);
    } catch (error) {
      console.error('Failed to sync consent with analytics provider:', error);
    }
  }, [consentState, provider]);

  const setConsentPreferences = useCallback(
    (preferences: ConsentPreferences): void => {
      const newState: ConsentState = {
        preferences,
        timestamp: getCurrentTimestamp(),
      };

      try {
        CookieStorage.setItem(CONSENT_COOKIE_KEY, newState, {
          expires: CONSENT_COOKIE_EXPIRY_DAYS,
          sameSite: 'Lax',
          secure: true,
        });
        setConsentState(newState);
      } catch (error) {
        console.error('Failed to save consent preferences:', error);
        throw error;
      }
    },
    [getCurrentTimestamp],
  );

  const grantAllConsent = useCallback((): void => {
    setConsentPreferences({ analytics: true, sessionRecording: true });
  }, [setConsentPreferences]);

  const denyAllConsent = useCallback((): void => {
    setConsentPreferences({ analytics: false, sessionRecording: false });
  }, [setConsentPreferences]);

  const contextValue = useMemo(
    () => ({
      consentState,
      hasAnalyticsConsent: consentState?.preferences.analytics ?? false,
      hasSessionRecordingConsent: consentState?.preferences.sessionRecording ?? false,
      hasDecision: consentState !== null,
    }),
    [consentState],
  );

  const mutationValue = useMemo(
    () => ({ grantAllConsent, denyAllConsent, setConsentPreferences }),
    [grantAllConsent, denyAllConsent, setConsentPreferences],
  );

  return (
    <ConsentMutationContextProvider value={mutationValue}>
      <ConsentContextProvider value={contextValue}>{children}</ConsentContextProvider>
    </ConsentMutationContextProvider>
  );
}
