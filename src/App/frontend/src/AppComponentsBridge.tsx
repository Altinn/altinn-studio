import React from 'react';
import type { PropsWithChildren } from 'react';

import { AppComponentsProvider } from 'src/app-components/AppComponentsProvider';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import type { TranslationKey } from 'src/app-components/types';
import type { FixedLanguageList } from 'src/language/languages';
import type { LooseAutocomplete } from 'src/types';

export function AppComponentsBridge({ children }: PropsWithChildren) {
  const { langAsString } = useLanguage();

  return (
    <AppComponentsProvider
      translate={langAsString}
      TranslateComponent={({ tKey, params }) => (
        <Lang
          id={tKey}
          params={params}
        />
      )}
    >
      {children}
    </AppComponentsProvider>
  );
}

export function translationKey<K extends LooseAutocomplete<keyof FixedLanguageList> | undefined>(key: K) {
  return key as unknown as K extends undefined ? undefined : TranslationKey;
}
