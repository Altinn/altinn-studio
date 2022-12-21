import React from 'react';
import { TextEditor } from './TextEditor';
import type { ILangEditorProps } from './TextEditor';
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

  const renderTextEditor = (props: Partial<ILangEditorProps> = {}) => {
    const allProps = {
      availableLangCodes: ['nb', 'en'],
      translations,
      selectedLangCode: 'nb',
      onAddLang: jest.fn(),
      onTranslationChange: jest.fn(),
      onSelectedLangChange: jest.fn(),
      onDeleteLang: jest.fn(),
      ...props,
    } as ILangEditorProps;

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

  it('fires onDeleteLang when Delete lang is clicked', async () => {
    const handleDeleteLang = jest.fn();
    renderTextEditor({
      onDeleteLang: handleDeleteLang,
    });
    const deleteBtn = screen.getByTestId('delete-en');

    await user.click(deleteBtn);

    expect(handleDeleteLang).toHaveBeenCalledWith('en');
  });

  it('fires onSelectedLang change when lang is changed', async () => {
    const handleSelectedLangChange = jest.fn();
    renderTextEditor({
      onSelectedLangChange: handleSelectedLangChange,
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

    expect(handleSelectedLangChange).toHaveBeenCalledWith('en');
  });
});
