import type { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { LanguageTranslatorProvider, parseAndCleanText } from '@app/form-component';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import type { SimpleLangParam } from '@app/language';
import { EDITOR_LANGUAGE } from '../../constants';
import type { TextsById } from '../../types';

export type PlainTextsProviderProps = PropsWithChildren<{
  /** Texts to show as they are, by the key the shared components ask for. */
  texts: TextsById;
}>;

/**
 * Shows the given texts as plain text, and passes other keys on to the editor's translator. It is for
 * texts on the canvas that are not app texts, such as the labels of a code list or a placeholder for
 * an answer, which would otherwise be editable.
 */
export function PlainTextsProvider({ texts, children }: PlainTextsProviderProps): ReactElement {
  const { lang, langAsString } = useTranslation();

  const translate = (key: string | undefined, params?: SimpleLangParam[]): ReactNode =>
    key !== undefined && Object.hasOwn(texts, key)
      ? parseAndCleanText(texts[key])
      : lang(key, params);

  const translateAsString = (key: string | undefined, params?: SimpleLangParam[]): string =>
    key !== undefined && Object.hasOwn(texts, key) ? texts[key] : langAsString(key, params);

  return (
    <LanguageTranslatorProvider
      lang={translate}
      langAsString={translateAsString}
      langAsNonProcessedString={translateAsString}
      currentLanguage={EDITOR_LANGUAGE}
    >
      {children}
    </LanguageTranslatorProvider>
  );
}
