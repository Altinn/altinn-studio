import React from 'react';
import type { PropsWithChildren } from 'react';

import { CurrentLanguageProvider } from '@app/form-component';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';

/**
 * Provides the app's current language code to the form-component library. This is app-global, so it
 * is mounted once near the app root (in AppLayout) — unlike the translation functions in
 * {@link AppLanguageTranslatorProvider}, which are re-provided per component because they depend on
 * the surrounding data-model location.
 */
export function AppCurrentLanguageProvider({ children }: PropsWithChildren) {
  const currentLanguage = useCurrentLanguage();

  return <CurrentLanguageProvider currentLanguage={currentLanguage}>{children}</CurrentLanguageProvider>;
}
