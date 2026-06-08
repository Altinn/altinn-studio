import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import type { Decorator } from '@storybook/react-vite';

/**
 * Storybook decorator that wraps stories in {@link StaticLanguageTranslatorProvider}, so components
 * relying on `useTranslation()` render the real translations from `@app/language` in Storybook.
 */
export const withLanguageTranslator: Decorator = (Story) => (
  <StaticLanguageTranslatorProvider>
    <Story />
  </StaticLanguageTranslatorProvider>
);
