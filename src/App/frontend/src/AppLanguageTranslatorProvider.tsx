import React from 'react';
import type { PropsWithChildren } from 'react';

import { LanguageTranslatorProvider } from '@app/form-component';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';

export function AppLanguageTranslatorProvider({ children }: PropsWithChildren) {
  const { langAsString } = useLanguage();

  return (
    <LanguageTranslatorProvider
      translate={langAsString}
      TranslateComponent={({ tKey, params }) => (
        <Lang
          id={tKey}
          params={params}
        />
      )}
    >
      {children}
    </LanguageTranslatorProvider>
  );
}
