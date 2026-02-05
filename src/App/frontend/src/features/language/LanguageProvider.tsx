import { useSearchParams } from 'react-router-dom';

import { SearchParams } from 'src/core/routing/types';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useCookieState } from 'src/hooks/useCookieState';

export function getAppLanguages() {
  return window.altinnAppGlobalData.availableLanguages.map((lang) => lang.language);
}

export function useSetCurrentLanguage() {
  const [_, setLanguageCookie] = useCookieState<string | null>('lang', null);

  return (lang: string) => {
    setLanguageCookie(lang);
  };
}

export function useCurrentLanguage() {
  const languageFromProfile = useProfile()?.profileSettingPreference.language;
  const [searchParams] = useSearchParams();
  const languageFromUrl = searchParams.get(SearchParams.Language);
  const [languageFromCookie] = useCookieState<string | null>('lang', null);

  const currentLanguage = useResolveCurrentLanguage({
    languageFromCookie,
    languageFromUrl,
    languageFromProfile,
  });

  return currentLanguage;
}

type ResolveLanguageProps = {
  languageFromCookie: string | null | undefined;
  languageFromUrl: string | null | undefined;
  languageFromProfile: string | null | undefined;
};
/**
 * Determines the current language based on the user's preferences and what the app has available
 */
function useResolveCurrentLanguage({
  languageFromCookie,
  languageFromUrl,
  languageFromProfile,
}: ResolveLanguageProps): string {
  const appLanguages = getAppLanguages();
  // We don't know what languages the app has available yet, so we just use whatever the user wants for now
  if (!appLanguages) {
    return languageFromCookie ?? languageFromUrl ?? languageFromProfile ?? 'nb';
  }

  // Try to fulfill the user's preferences in order of priority

  if (languageFromCookie) {
    if (appLanguages.includes(languageFromCookie)) {
      return languageFromCookie;
    }
    window.logWarnOnce(
      `User's preferred language (${languageFromCookie}) from language selector / cookie is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
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
