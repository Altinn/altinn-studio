import { useSearchParams } from 'react-router';

import { SearchParams } from 'src/core/routing/types';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useCookieState } from 'src/hooks/useCookieState';

/**
  URL search param = temporary override (e.g., shared link)
  Cookie = persistent user preference (set via language selector)
  Profile = fallback from profile settings
 */

export function getAvailableLanguages() {
  return window.altinnAppGlobalData.availableLanguages.map((lang) => lang.language);
}

function useLanguageCookie() {
  return useCookieState<string | null>('lang', null);
}

export function useSetCurrentLanguage() {
  const [_, setLanguageCookie] = useLanguageCookie();
  const [searchParams, setSearchParams] = useSearchParams();

  return (lang: string) => {
    setLanguageCookie(lang);

    if (searchParams.has(SearchParams.Language)) {
      searchParams.delete(SearchParams.Language);
      setSearchParams(searchParams);
    }
  };
}

/**
 * Determines the current language based on the url, cookie or user's
 * profile preferences within the available languages of the app
 */
export function useCurrentLanguage() {
  const [searchParams] = useSearchParams();
  const availableLanguages = getAvailableLanguages();

  const languageFromUrl = searchParams.get(SearchParams.Language);
  const [languageFromCookie] = useLanguageCookie();
  const languageFromProfile = useProfile()?.profileSettingPreference.language;

  return resolveCurrentLanguage({
    availableLanguages,
    languageFromUrl,
    languageFromCookie,
    languageFromProfile,
  });
}

type ResolveCurrentLanguageProps = {
  availableLanguages: string[];
  languageFromUrl: string | null;
  languageFromCookie: string | null;
  languageFromProfile: string | null | undefined;
};

export function resolveCurrentLanguage({
  availableLanguages,
  languageFromUrl,
  languageFromCookie,
  languageFromProfile,
}: ResolveCurrentLanguageProps): string {
  if (availableLanguages.length === 0) {
    // The app has not defined any languages, something is probably wrong.
    window.logErrorOnce('Cannot find any available languages for this app. Are there any text resource files defined?');
    return 'nb';
  }

  if (languageFromUrl) {
    if (availableLanguages.includes(languageFromUrl)) {
      return languageFromUrl;
    }
    window.logWarnOnce(
      `User's preferred language from query parameter (lang=${languageFromUrl}) is not supported by the app, supported languages: [${availableLanguages.join(', ')}]`,
    );
  }

  if (languageFromCookie) {
    if (availableLanguages.includes(languageFromCookie)) {
      return languageFromCookie;
    }
    window.logWarnOnce(
      `User's preferred language (${languageFromCookie}) from language selector / cookie is not supported by the app, supported languages: [${availableLanguages.join(', ')}]`,
    );
  }

  if (languageFromProfile) {
    if (availableLanguages.includes(languageFromProfile)) {
      return languageFromProfile;
    }
    window.logInfoOnce(
      `User's preferred language (${languageFromProfile}) from Altinn profile is not supported by the app, supported languages: [${availableLanguages.join(', ')}]`,
    );
  }

  // The user has no valid preference, try to fall back to one of the standard languages that the app supports
  if (availableLanguages.includes('nb')) {
    return 'nb';
  }
  if (availableLanguages.includes('nn')) {
    return 'nn';
  }
  if (availableLanguages.includes('en')) {
    return 'en';
  }

  // None of the standard or preferred languages are supported, return the first supported language.
  return availableLanguages[0];
}
