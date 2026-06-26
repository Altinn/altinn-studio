import React from 'react';
import type { PropsWithChildren } from 'react';

import { LanguageTranslatorProvider } from '@app/form-component';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';

export function AppLanguageTranslatorProvider({ children }: PropsWithChildren) {
  const { lang, langAsString, langAsNonProcessedString } = useLanguage();
  const currentLanguage = useCurrentLanguage();

  return (
    <LanguageTranslatorProvider
      lang={lang}
      langAsString={langAsString}
      langAsNonProcessedString={langAsNonProcessedString}
      currentLanguage={currentLanguage}
    >
      {children}
    </LanguageTranslatorProvider>
  );
}
