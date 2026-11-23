import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { getLanguageFromCode } from '@app/language';
import { TEXT_KEY_ATTRIBUTE } from '../../constants';
import type { TextsById } from '../../types';
import { EditorTranslatorProvider } from './EditorTranslatorProvider';

const appTextKey = 'page.title';
const appText = 'Søknad om parkering';
const builtInKey = 'general.cancel';
const builtInText = getLanguageFromCode('nb')[builtInKey];

// Matches the text when it is inside an element marked as editable with the given key.
const editableTextSelector = (textKey: string): string =>
  `[${TEXT_KEY_ATTRIBUTE}="${textKey}"], [${TEXT_KEY_ATTRIBUTE}="${textKey}"] *`;
const anyEditableTextSelector = `[${TEXT_KEY_ATTRIBUTE}], [${TEXT_KEY_ATTRIBUTE}] *`;

describe('EditorTranslatorProvider', () => {
  it('shows an app text as editable text marked with its key', () => {
    renderEditorTranslatorProvider({ texts: { [appTextKey]: appText }, textKey: appTextKey });
    expect(
      screen.getByText(appText, { selector: editableTextSelector(appTextKey) }),
    ).toBeInTheDocument();
  });

  it('shows a key that has no text as editable text, so the text can be added', () => {
    renderEditorTranslatorProvider({ texts: {}, textKey: appTextKey });
    expect(
      screen.getByText(appTextKey, { selector: editableTextSelector(appTextKey) }),
    ).toBeInTheDocument();
  });

  it('shows a built-in text as text that is not editable', () => {
    renderEditorTranslatorProvider({ texts: {}, textKey: builtInKey });
    expect(screen.getByText(builtInText)).toBeInTheDocument();
    expect(screen.queryByText(builtInText, { selector: anyEditableTextSelector })).toBeNull();
  });

  it('returns app texts as plain strings where a string is needed', () => {
    renderEditorTranslatorProvider({ texts: { [appTextKey]: appText }, textKey: appTextKey });
    expect(screen.getByRole('button', { name: appText })).toBeInTheDocument();
  });
});

type RenderProps = {
  texts: TextsById;
  textKey: string;
};

function TranslatedTexts({ textKey }: { textKey: string }) {
  const { lang, langAsString } = useTranslation();
  return (
    <>
      <p>{lang(textKey)}</p>
      <button type='button' aria-label={langAsString(textKey)} />
    </>
  );
}

function renderEditorTranslatorProvider({ texts, textKey }: RenderProps) {
  return render(
    <EditorTranslatorProvider texts={texts} onSaveText={vi.fn()}>
      <TranslatedTexts textKey={textKey} />
    </EditorTranslatorProvider>,
  );
}
