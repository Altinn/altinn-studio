import React from 'react';
import type { PropsWithChildren } from 'react';

import { AppComponentsProvider } from 'src/app-components/AppComponentsProvider';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import type { TranslationKeyMap } from 'src/app-components/AppComponentsProvider';
import type { TranslationKey } from 'src/app-components/types';
import type { FixedLanguageList } from 'src/language/languages';
import type { LooseAutocomplete } from 'src/types';

export function AppComponentsBridge({ children }: PropsWithChildren) {
  const { langAsString } = useLanguage();
  const translationKeyMap: TranslationKeyMap = {
    'button.loading': translationKey('general.loading'),
    'pagination.page_number': translationKey('general.page_number'),
    'input.exceeded_max_limit': translationKey('input_components.exceeded_max_limit'),
    'input.remaining_characters': translationKey('input_components.remaining_characters'),
  };

  return (
    <AppComponentsProvider
      translate={langAsString}
      TranslateComponent={({ tKey, params }) => (
        <Lang
          id={tKey}
          params={params}
        />
      )}
      translationKeyMap={translationKeyMap}
    >
      {children}
    </AppComponentsProvider>
  );
}

export function translationKey<K extends LooseAutocomplete<keyof FixedLanguageList> | undefined>(key: K) {
  return key as unknown as K extends undefined ? undefined : TranslationKey;
}
