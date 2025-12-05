import { useAppLanguages } from 'src/domain/Language/appLanguages';
import { getUserProfile } from 'src/domain/User/getUserProfile';
import { useResolveCurrentLanguage } from 'src/features/language/useResolveCurrentLanguage';
import { useLocalStorageState } from 'src/hooks/useLocalStorageState';

export const useCurrentLanguage = () => {
  const appLanguages = useAppLanguages();
  const profile = getUserProfile();
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

export const useSetLanguageWithSelector = () => {
  const profile = getUserProfile();
  const userId = profile.userId;
  const [_, setWithLanguageSelector] = useLocalStorageState(['selectedLanguage', userId], null);
  return setWithLanguageSelector;
};

/**
 * AppRoutingContext is not provided yet, so we have to get this manually.
 * This unfortunately means that the value is not reactive, and will not update
 * if this query param changes after initial load.
 */
export function getLanguageFromUrl() {
  const params = new URLSearchParams(window.location.search.split('?')[1]);
  return params.get('lang');
}
