import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import type { LooseAutocomplete, TranslationKey } from 'src/app-components/types';

type AppComponentsTranslationKey =
  | 'button.loading'
  | 'pagination.page_number'
  | 'input.remaining_characters'
  | 'input.exceeded_max_limit';
export type TranslationKeyMap = Record<AppComponentsTranslationKey, TranslationKey>;

// Minimal interface — only what app-components actually need
type TranslationParams = (string | number | undefined)[];
type TranslateFn = (key: LooseAutocomplete<AppComponentsTranslationKey>, params?: TranslationParams) => string;
type TranslateComponent = (args: {
  tKey: string;
  params?: TranslationParams;
}) => string | React.JSX.Element | React.JSX.Element[] | null;

type AppComponentsContextProps = {
  translate: TranslateFn;
  TranslateComponent: TranslateComponent;
  translationKeyMap: TranslationKeyMap;
};
const AppComponentsContext = createContext<AppComponentsContextProps | null>(null);

export function AppComponentsProvider({
  translate,
  TranslateComponent,
  translationKeyMap,
  children,
}: PropsWithChildren<AppComponentsContextProps>) {
  return (
    <AppComponentsContext.Provider value={{ translate, TranslateComponent, translationKeyMap }}>
      {children}
    </AppComponentsContext.Provider>
  );
}

export function useTranslation(): Pick<AppComponentsContextProps, 'translate' | 'TranslateComponent'> {
  const context = useContext(AppComponentsContext);
  if (!context) {
    throw new Error('AppComponentsProvider missing');
  }

  return {
    translate: (key, params) => context.translate(context.translationKeyMap[key], params),
    TranslateComponent: ({ tKey, params }) =>
      context.TranslateComponent({ tKey: context.translationKeyMap[tKey], params }),
  };
}
