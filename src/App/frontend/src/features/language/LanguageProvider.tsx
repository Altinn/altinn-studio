import React from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useProfileQuery } from 'src/features/profile/ProfileProvider';
import { useCookieState } from 'src/hooks/useCookieState';

interface LanguageCtx {
  current: string;
  languageResolved: boolean;
  appLanguages: string[] | undefined;
  setWithLanguageSelector: (language: string) => void;
}

const { Provider, useCtx } = createContext<LanguageCtx>({
  name: 'Language',
  required: false,
  default: {
    current: 'nb',
    languageResolved: false,
    appLanguages: undefined,
    setWithLanguageSelector: () => {
      throw new Error('LanguageProvider not initialized');
    },
  },
});

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const { data: profile, isLoading: isProfileLoading } = useProfileQuery();

  const languageFromProfile = isProfileLoading ? undefined : profile?.profileSettingPreference.language;
  const languageFromUrl = getLanguageFromUrl();
  const [languageFromSelector, setWithLanguageSelector] = useCookieState<string | null>('lang', null);

  const appLanguages = globalThis.altinnAppGlobalData.availableLanguages.map((lang) => lang.language);

  const current = useResolveCurrentLanguage(appLanguages, {
    languageFromSelector,
    languageFromUrl,
    languageFromProfile,
  });

  const languageResolved = !isProfileLoading;

  return (
    <Provider
      value={{
        current,
        appLanguages,
        languageResolved,
        setWithLanguageSelector,
      }}
    >
      <div lang={current}>{children}</div>
    </Provider>
  );
};

export const useCurrentLanguage = () => useCtx().current;
export const useIsCurrentLanguageResolved = () => useCtx().languageResolved;
export const useAppLanguages = () => useCtx().appLanguages;
export const useSetLanguageWithSelector = () => useCtx().setWithLanguageSelector;

/**
 * AppRoutingContext is not provided yet, so we have to get this manually.
 * This unfortunately means that the value is not reactive, and will not update
 * if this query param changes after initial load.
 */
function getLanguageFromUrl() {
  const params = new URLSearchParams(globalThis.location.search);
  return params.get('lang');
}

/**
 * Determines the current language based on the user's preferences and what the app has available
 */
function useResolveCurrentLanguage(
  appLanguages: string[] | undefined,
  {
    languageFromSelector,
    languageFromUrl,
    languageFromProfile,
  }: {
    languageFromSelector?: string | null;
    languageFromUrl?: string | null;
    languageFromProfile?: string | null;
  },
): string {
  // We don't know what languages the app has available yet, so we just use whatever the user wants for now
  if (!appLanguages) {
    return languageFromSelector ?? languageFromUrl ?? languageFromProfile ?? 'nb';
  }

  // Try to fulfill the user's preferences in order of priority

  if (languageFromSelector) {
    if (appLanguages.includes(languageFromSelector)) {
      return languageFromSelector;
    }
    globalThis.logWarnOnce(
      `User's preferred language (${languageFromSelector}) from language selector / cookie is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
    );
  }

  if (languageFromUrl) {
    if (appLanguages.includes(languageFromUrl)) {
      return languageFromUrl;
    }
    globalThis.logWarnOnce(
      `User's preferred language from query parameter (lang=${languageFromUrl}) is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
    );
  }

  if (languageFromProfile) {
    if (appLanguages.includes(languageFromProfile)) {
      return languageFromProfile;
    }
    globalThis.logInfoOnce(
      `User's preferred language (${languageFromProfile}) from Altinn profile is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
    );
  }

  // The user has no valid preference, try to fall back to one of the standard languages that the app supports

  if (appLanguages.includes('nb')) {
    return 'nb';
  }
  if (appLanguages.includes('nn')) {
    return 'nn';
  }
  if (appLanguages.includes('en')) {
    return 'en';
  }

  // None of the standard languages are supported, try the first supported language

  if (appLanguages.length) {
    return appLanguages[0];
  }

  // The app has not defined any languages, something is probably wrong

  globalThis.logErrorOnce('When fetching app languages the app returned 0 languages');

  return 'nb';
}
