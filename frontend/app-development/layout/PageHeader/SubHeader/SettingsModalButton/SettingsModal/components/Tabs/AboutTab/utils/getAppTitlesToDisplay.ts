import type { ServiceNames } from '../types/ServiceNames';
import { ArrayUtils } from '@studio/pure-functions';

export const recommendedLanguages: string[] = ['nb', 'nn', 'en'];

export const getAppTitlesToDisplay = (
  appMetadataTitles: ServiceNames,
  appLangCodesData: string[],
): ServiceNames => {
  const appLangCodesIncludingRecommended: string[] = ArrayUtils.removeDuplicates(
    recommendedLanguages.concat(Object.keys(appMetadataTitles)).concat(appLangCodesData),
  );
  return Object.fromEntries(
    appLangCodesIncludingRecommended.map((lang) => [lang, appMetadataTitles[lang]]),
  );
};
