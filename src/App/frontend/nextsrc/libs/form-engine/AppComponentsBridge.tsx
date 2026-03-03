import React from 'react';
import type { PropsWithChildren } from 'react';

import { AppComponentsProvider } from 'src/app-components/AppComponentsProvider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import type { TranslationKey } from 'src/app-components/types';

export function AppComponentsBridge({ children }: PropsWithChildren) {
  const { langAsString } = useLanguage();

  return (
    <AppComponentsProvider
      translate={langAsString}
      TranslateComponent={({ tKey, params }) => <>{langAsString(tKey, params?.filter((p): p is string | number => p !== undefined))}</>}
    >
      {children}
    </AppComponentsProvider>
  );
}

/**
 * Cast a text resource key (or undefined) to TranslationKey for use with app-components.
 */
export function asTranslationKey(key: string | undefined): TranslationKey | undefined {
  return key as TranslationKey | undefined;
}
