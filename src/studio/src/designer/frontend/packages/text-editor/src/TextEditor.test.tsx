import React from 'react';
import { TextEditor } from './TextEditor';
import type { ILanguageEditorProps } from './TextEditor';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('TextEditor', () => {
  const user = userEvent.setup();

  const translations = {
    key1: 'value1',
    key2: 'value2',
  };

  beforeEach(() => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  const render = (props: Partial<ILanguageEditorProps> = {}) => {
    const allProps = {
      availableLanguageCodes: ['nb', 'en'],
      translations,
      selectedLangCode: 'nb',
      onAddLanguage: jest.fn(),
      onTranslationChange: jest.fn(),
      onSelectedLanguageChange: jest.fn(),
      onDeleteLanguage: jest.fn(),
      ...props,
    } as ILanguageEditorProps;

    rtlRender(<TextEditor {...allProps} />);
  };

  it('fires onTranslationChange when Add new is clicked', async () => {
    const handleAddNew = jest.fn();
    render({
      onTranslationChange: handleAddNew,
    });
    const addBtn = screen.getByRole('button', {
      name: /ny tekst/i,
    });

    await user.click(addBtn);

    expect(handleAddNew).toHaveBeenCalledWith({
      translations: {
        id_1000: '',
        ...translations,
      },
    });
  });

  it('fires onDeleteLanguage when Delete language is clicked', async () => {
    const handleDeleteLanguage = jest.fn();
    render({
      onDeleteLanguage: handleDeleteLanguage,
    });
    const deleteBtn = screen.getByTestId('delete-en');

    await user.click(deleteBtn);

    expect(handleDeleteLanguage).toHaveBeenCalledWith({ value: 'en' });
  });

  it('fires onSelectedLanguage change when language is changed', async () => {
    const handleSelectedLanguageChange = jest.fn();
    render({
      onSelectedLanguageChange: handleSelectedLanguageChange,
    });

    const norwegianRadio = screen.getByRole('radio', {
      name: /norsk bokmål/i,
    });
    const englishRadio = screen.getByRole('radio', {
      name: /engelsk/i,
    });
    expect(norwegianRadio).toBeChecked();
    expect(englishRadio).not.toBeChecked();

    await user.click(englishRadio);

    expect(handleSelectedLanguageChange).toHaveBeenCalledWith({ value: 'en' });
  });
});
