import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '@altinn-studio/language/src/nb.json';
import en from '@altinn-studio/language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

export type TranslationResources = {
  nb?: Record<string, unknown>;
  en?: Record<string, unknown>;
};

export function initI18n(extraResources: TranslationResources = {}): void {
  if (i18next.isInitialized) return;
  i18next.use(initReactI18next).init({
    lng: DEFAULT_LANGUAGE,
    resources: {
      nb: { translation: { ...nb, ...extraResources.nb } },
      en: { translation: { ...en, ...extraResources.en } },
    },
    fallbackLng: 'nb',
    react: {
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['em'],
    },
  });
}
