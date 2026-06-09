import type { ReactElement } from 'react';

import {
  type StaticLanguageCode,
  StaticLanguageTranslatorProvider,
} from '@app/form-component/test/StaticLanguageTranslatorProvider';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

export type RenderWithTranslationsOptions = Omit<RenderOptions, 'wrapper'> & {
  /** Language used to resolve translations. Defaults to 'en'. */
  language?: StaticLanguageCode;
};

/**
 * Renders `ui` wrapped in a {@link StaticLanguageTranslatorProvider}, so components that rely on
 * `useTranslation()` get real translations from the `@app/language` package without having to set
 * up a provider in every test. Pass `language` to switch locale (defaults to 'en').
 */
export function renderWithTranslations(
  ui: ReactElement,
  { language = 'en', ...options }: RenderWithTranslationsOptions = {},
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => (
      <StaticLanguageTranslatorProvider language={language}>
        {children}
      </StaticLanguageTranslatorProvider>
    ),
    ...options,
  });
}
