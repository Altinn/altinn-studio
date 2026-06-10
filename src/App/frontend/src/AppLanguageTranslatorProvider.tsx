import React from 'react';
import type { PropsWithChildren } from 'react';

import { LanguageTranslatorProvider } from '@app/form-component';

import { useLanguage } from 'src/features/language/useLanguage';

export function AppLanguageTranslatorProvider({ children }: PropsWithChildren) {
  const { lang, langAsString } = useLanguage();

  return (
    <LanguageTranslatorProvider
      lang={lang}
      langAsString={langAsString}
    >
      {children}
    </LanguageTranslatorProvider>
  );
}
