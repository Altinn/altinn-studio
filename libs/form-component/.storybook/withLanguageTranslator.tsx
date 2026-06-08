import { LanguageTranslatorProvider } from '@app/form-component/LanguageTranslatorProvider';
import {
  type FixedLanguageList,
  getLanguageFromCode,
  type LooseAutocomplete,
  replaceParameters,
  type SimpleLangParam,
  type ValidLanguageKey,
} from '@app/language';
import type { Decorator } from '@storybook/react-vite';

// English is used as the language for Storybook previews.
const language: FixedLanguageList = getLanguageFromCode('en');

/**
 * Looks up the real translation for a key and substitutes positional `{0}`, `{1}`, ... params.
 * Falls back to the key itself if it is missing, mirroring the no-op provider behaviour.
 */
function translateKey(
  key: LooseAutocomplete<ValidLanguageKey> | undefined,
  params?: SimpleLangParam[],
): string {
  if (key === undefined) {
    return '';
  }
  const text = language[key as ValidLanguageKey] ?? key;
  if (!params?.length) {
    return text;
  }
  return replaceParameters(text, params);
}

/**
 * Storybook decorator that wires up {@link LanguageTranslatorProvider} with the real translations
 * from the `@app/language` package, so components relying on `useTranslation()` render translated
 * text in Storybook just like they do in the app.
 */
export const withLanguageTranslator: Decorator = (Story) => (
  <LanguageTranslatorProvider
    lang={translateKey}
    translate={translateKey}
    TranslateComponent={({ tKey, params }) => translateKey(tKey, params)}
  >
    <Story />
  </LanguageTranslatorProvider>
);
