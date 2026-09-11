import type { ReactElement } from 'react';

import {
  type StaticLanguageCode,
  StaticLanguageTranslatorProvider,
} from '@app/form-component/test/StaticLanguageTranslatorProvider';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

export type RenderWithTranslationsOptions = Omit<RenderOptions, 'wrapper'> & {
  /** Language used to resolve translations. Defaults to 'en'. */
  language?: StaticLanguageCode;
  /**
   * Custom text-resource overrides, keyed by text-resource binding (e.g. `{ 'my.title': 'My Title' }`).
   * They take precedence over the built-in translations, so you only need to supply the app-specific
   * keys your component uses and get the real `@app/language` translations for everything else.
   */
  overrides?: Record<string, string>;
};

/**
 * Renders `ui` wrapped in a {@link StaticLanguageTranslatorProvider}, so components that rely on
 * `useTranslation()` get real translations from the `@app/language` package without having to set
 * up a provider in every test. Pass `language` to switch locale (defaults to 'en'), and `overrides`
 * to resolve custom text-resource keys.
 */
export function renderWithTranslations(
  ui: ReactElement,
  { language = 'en', overrides, ...options }: RenderWithTranslationsOptions = {},
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => (
      <StaticLanguageTranslatorProvider language={language} overrides={overrides}>
        {children}
      </StaticLanguageTranslatorProvider>
    ),
    ...options,
  });
}
