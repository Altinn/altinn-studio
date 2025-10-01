import { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { useGetAppLanguageQuery } from 'src/features/language/textResources/useGetAppLanguagesQuery';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useLocalStorageState } from 'src/hooks/useLocalStorageState';

/**
 * AppRoutingContext is not provided yet, so we have to get this manually.
 * This unfortunately means that the value is not reactive, and will not update
 * if this query param changes after initial load.
 */
function getLanguageFromUrl() {
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  return params.get('lang');
}

/**
 * Determines the current language based on the user's preferences and what the app has available
 */
function resolveCurrentLanguage(
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
    window.logWarnOnce(
      `User's preferred language (${languageFromSelector}) from language selector / localstorage is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
    );
  }

  if (languageFromUrl) {
    if (appLanguages.includes(languageFromUrl)) {
      return languageFromUrl;
    }
    window.logWarnOnce(
      `User's preferred language from query parameter (lang=${languageFromUrl}) is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
    );
  }

  if (languageFromProfile) {
    if (appLanguages.includes(languageFromProfile)) {
      return languageFromProfile;
    }
    window.logInfoOnce(
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

  window.logErrorOnce('When fetching app languages the app returned 0 languages');

  return 'nb';
}

export const useCurrentLanguage = () => {
  const profile = useProfile();
  const userId = profile?.userId;
  const languageFromProfile = profile?.profileSettingPreference.language;
  const languageFromUrl = getLanguageFromUrl();
  const [languageFromSelector] = useLocalStorageState(['selectedLanguage', userId], null);

  const { data: appLanguages } = useGetAppLanguageQuery();

  return useMemo(
    () =>
      resolveCurrentLanguage(appLanguages, {
        languageFromSelector,
        languageFromUrl,
        languageFromProfile,
      }),
    [appLanguages, languageFromSelector, languageFromUrl, languageFromProfile],
  );
};

export const useIsCurrentLanguageResolved = () => true;

export const useAppLanguages = () => {
  const { data } = useGetAppLanguageQuery();
  return data;
};

export const useSetLanguageWithSelector = () => {
  const profile = useProfile();
  const userId = profile?.userId;
  const [, setLanguage] = useLocalStorageState(['selectedLanguage', userId], null);
  return setLanguage;
};

// Legacy exports for backward compatibility
export const LanguageProvider = ({ children }: PropsWithChildren) => children;
export const SetShouldFetchAppLanguages = () => null;
