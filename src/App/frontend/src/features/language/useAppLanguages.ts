import { useResolveCurrentLanguage } from 'src/features/language/useResolveCurrentLanguage';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useLocalStorageState } from 'src/hooks/useLocalStorageState';

export const useAppLanguages = () => window.AltinnAppData.availableLanguages.map((lang) => lang.language);

export const useCurrentLanguage = () => {
  const appLanguages = useAppLanguages();
  const profile = useProfile();
  const userId = profile?.userId;
  const languageFromProfile = profile?.profileSettingPreference.language;
  const languageFromUrl = getLanguageFromUrl();
  const [languageFromSelector, _] = useLocalStorageState(['selectedLanguage', userId], null);

  const currentLangString = useResolveCurrentLanguage(appLanguages, {
    languageFromSelector,
    languageFromUrl,
    languageFromProfile,
  });

  const currentLanguage = appLanguages.find((lang) => lang === currentLangString);
  if (!currentLanguage) {
    throw new Error('current language not found, this should never happen');
  }
  return currentLanguage;
};
export const useIsCurrentLanguageResolved = () => true;

export const useSetLanguageWithSelector = () => {
  const profile = useProfile();
  const userId = profile?.userId;
  const [_, setWithLanguageSelector] = useLocalStorageState(['selectedLanguage', userId], null);
  return setWithLanguageSelector;
};

/**
 * AppRoutingContext is not provided yet, so we have to get this manually.
 * This unfortunately means that the value is not reactive, and will not update
 * if this query param changes after initial load.
 */
export function getLanguageFromUrl() {
  const params = new URLSearchParams(window.location.hash.split('?')[1]);
  return params.get('lang');
}
