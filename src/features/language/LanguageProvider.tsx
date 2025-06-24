import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useGetAppLanguageQuery } from 'src/features/language/textResources/useGetAppLanguagesQuery';
import { useAllowAnonymousIs } from 'src/features/stateless/getAllowAnonymous';
import { useLocalStorageState } from 'src/hooks/useLocalStorageState';
import { isAtLeastVersion } from 'src/utils/versionCompare';
import type { IProfile } from 'src/types/shared';

interface LanguageCtx {
  current: string;
  languageResolved: boolean;
  appLanguages: string[] | undefined;
  setProfileForLanguage: (profile: IProfile | null) => void;
  setWithLanguageSelector: (language: string) => void;
  setShouldFetchAppLanguages: (shouldFetch: boolean) => void;
}

const { Provider, useCtx } = createContext<LanguageCtx>({
  name: 'Language',
  required: false,
  default: {
    current: 'nb',
    languageResolved: false,
    appLanguages: undefined,
    setProfileForLanguage: () => {
      throw new Error('LanguageProvider not initialized');
    },
    setWithLanguageSelector: () => {
      throw new Error('LanguageProvider not initialized');
    },
    setShouldFetchAppLanguages: () => {
      throw new Error('LanguageProvider not initialized');
    },
  },
});

const IsLoading = Symbol('IsLoading');
type Loading<T> = T | typeof IsLoading;

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  // LanguageProvider is provided so early that we cannot access much state directly, so we need to get them set externally.
  const [shouldFetchAppLanguages, setShouldFetchAppLanguages] = useState<Loading<boolean>>(IsLoading);
  const [profile, setProfileForLanguage] = useState<Loading<IProfile | null>>(IsLoading);

  const userId = profile !== IsLoading ? profile?.userId : undefined;
  const languageFromProfile = profile !== IsLoading ? profile?.profileSettingPreference.language : undefined;

  const languageFromUrl = getLanguageFromUrl();
  const [languageFromSelector, setWithLanguageSelector] = useLocalStorageState(['selectedLanguage', userId], null);

  const { data: appLanguages, error, isFetching } = useGetAppLanguageQuery(shouldFetchAppLanguages === true);

  useEffect(() => {
    error && window.logError('Fetching app languages failed:\n', error);
  }, [error]);

  const current = useResolveCurrentLanguage(appLanguages, {
    languageFromSelector,
    languageFromUrl,
    languageFromProfile,
  });

  const languageResolved = profile !== IsLoading && shouldFetchAppLanguages !== IsLoading && !isFetching;

  return (
    <Provider
      value={{
        current,
        appLanguages,
        languageResolved,
        setShouldFetchAppLanguages,
        setProfileForLanguage,
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
export const useSetProfileForLanguage = () => useCtx().setProfileForLanguage;

/**
 * This is only to prevent a lot of 401 requests for apps where we know the request will fail.
 * Since https://github.com/Altinn/app-lib-dotnet/pull/1115 fetching app languages no longer requires auth,
 * so in the next major release where we require at least v9 all of this checking can be removed
 * and the useGetAppLanguageQuery can be always enabled instead.
 */
export const SetShouldFetchAppLanguages = () => {
  // We make the same assumption as in ProfileProvider that the user is logged in when the app does not allow anonymous.
  const userIsAuthenticated = useAllowAnonymousIs(false);
  const { altinnNugetVersion } = useApplicationMetadata();
  const appSupportsFetchAppLanguagesInAnonymous =
    altinnNugetVersion &&
    isAtLeastVersion({
      actualVersion: altinnNugetVersion,
      minimumVersion: '8.5.6.180',
    });

  const setShouldFetchAppLanguages = useCtx().setShouldFetchAppLanguages;
  const shouldFetchAppLanguages = appSupportsFetchAppLanguagesInAnonymous || userIsAuthenticated;
  useEffect(() => {
    setShouldFetchAppLanguages(shouldFetchAppLanguages);
  }, [shouldFetchAppLanguages, setShouldFetchAppLanguages]);

  return null;
};

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
