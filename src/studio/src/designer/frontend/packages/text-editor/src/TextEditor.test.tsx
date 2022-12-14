import React from 'react';
import { TextEditor } from './TextEditor';
import type { ILanguageEditorProps } from './TextEditor';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextResourceFile } from './types';

describe('TextEditor', () => {
  const user = userEvent.setup();

  const translations: TextResourceFile = {
    language: 'nb',
    resources: [
      {
        id: 'key1',
        value: 'value1',
      },
      {
        id: 'key2',
        value: 'value2',
      },
    ],
  };

  beforeEach(() => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  const renderTextEditor = (props: Partial<ILanguageEditorProps> = {}) => {
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
    const onTranslationChange = jest.fn();
    renderTextEditor({
      onTranslationChange: onTranslationChange,
    });
    const addBtn = screen.getByRole('button', {
      name: /ny tekst/i,
    });

    await user.click(addBtn);

    expect(onTranslationChange).toHaveBeenCalledWith({
      language: 'nb',
      resources: [
        {
          id: 'key1',
          value: 'value1',
        },
        {
          id: 'key2',
          value: 'value2',
        },
        {
          id: 'id_1000',
          value: '',
        },
      ],
    });
  });

  it('fires onDeleteLanguage when Delete language is clicked', async () => {
    const handleDeleteLanguage = jest.fn();
    renderTextEditor({
      onDeleteLanguage: handleDeleteLanguage,
    });
    const deleteBtn = screen.getByTestId('delete-en');

    await user.click(deleteBtn);

    expect(handleDeleteLanguage).toHaveBeenCalledWith('en');
  });

  it('fires onSelectedLanguage change when language is changed', async () => {
    const handleSelectedLanguageChange = jest.fn();
    renderTextEditor({
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

    expect(handleSelectedLanguageChange).toHaveBeenCalledWith('en');
  });
});
