import type { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { LanguageTranslatorProvider, parseAndCleanText } from '@app/form-component';
import { getLanguageFromCode, replaceParameters } from '@app/language';
import type { SimpleLangParam } from '@app/language';
import { EDITOR_LANGUAGE } from '../../constants';
import type { TextsById } from '../../types';
import { EditableText } from './EditableText';

const builtInTexts: TextsById = getLanguageFromCode(EDITOR_LANGUAGE);

export type EditorTranslatorProviderProps = PropsWithChildren<{
  /** The app's own texts in the edited language. */
  texts: TextsById;
}>;

/**
 * Translates text resource keys for the shared form components, like the app does, but returns the
 * app's own texts as editable text. Texts that are only used as strings, such as aria labels, stay
 * plain strings. Built-in texts from the app frontend, such as the required marker, are not editable.
 */
export function EditorTranslatorProvider({
  texts,
  children,
}: EditorTranslatorProviderProps): ReactElement {
  const resolveText = (key: string, params?: SimpleLangParam[]): string => {
    const text = texts[key] ?? builtInTexts[key] ?? key;
    return params?.length ? replaceParameters(text, params) : text;
  };

  // A key that is neither an app text nor a built-in text is an app text that has no value yet.
  const isAppText = (key: string): boolean =>
    Object.hasOwn(texts, key) || !Object.hasOwn(builtInTexts, key);

  const lang = (key: string | undefined, params?: SimpleLangParam[]): ReactNode => {
    if (key === undefined) return null;
    const text = resolveText(key, params);
    return isAppText(key) ? <EditableText textKey={key} text={text} /> : parseAndCleanText(text);
  };

  const langAsString = (key: string | undefined, params?: SimpleLangParam[]): string =>
    key === undefined ? '' : resolveText(key, params);

  return (
    <LanguageTranslatorProvider
      lang={lang}
      langAsString={langAsString}
      langAsNonProcessedString={langAsString}
      currentLanguage={EDITOR_LANGUAGE}
    >
      {children}
    </LanguageTranslatorProvider>
  );
}
