import React from 'react';
import { TextEditor } from './TextEditor';
import type { TextEditorProps } from './TextEditor';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TextResourceFile } from './types';

describe('TextEditor', () => {
  const norwegianTranslation: TextResourceFile = {
    language: 'nb',
    resources: [
      {
        id: 'textId1',
        value: 'norsk-1',
      },
      {
        id: 'textId2',
        value: 'norsk-2',
      },
    ],
  };

  beforeEach(() => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  const renderTextEditor = (props: Partial<TextEditorProps> = {}) => {
    const allProps = {
      availableLangCodes: ['nb', 'en'],
      translations: norwegianTranslation,
      selectedLangCode: 'nb',
      setSelectedLangCode: jest.fn(),
      onAddLang: jest.fn(),
      onTranslationChange: jest.fn(),
      onDeleteLang: jest.fn(),
      ...props,
    } as TextEditorProps;
    const user = userEvent.setup();
    rtlRender(<TextEditor {...allProps} />);
    return { user };
  };

  it('fires onTranslationChange when Add new is clicked', async () => {
    const onTranslationChange = jest.fn();
    const { user } = renderTextEditor({
      onTranslationChange: onTranslationChange,
    });
    const addBtn = screen.getByRole('button', {
      name: /ny tekst/i,
    });

    await user.click(addBtn);

    expect(onTranslationChange).toHaveBeenCalledWith({
      language: 'nb',
      resources: [
        ...norwegianTranslation.resources,
        {
          id: 'id_1000',
          value: '',
        },
      ],
    });
  });

  it('fires onDeleteLang when Delete lang is clicked', async () => {
    const handleDeleteLang = jest.fn();
    const { user } = renderTextEditor({
      onDeleteLang: handleDeleteLang,
    });
    const deleteBtn = screen.getByTestId('delete-en');

    await user.click(deleteBtn);

    expect(handleDeleteLang).toHaveBeenCalledWith('en');
  });

  it('calls setSelectedLang code when lang is changed', async () => {
    const setSelectedLangCode = jest.fn((lang: string) => lang);
    const { user } = renderTextEditor({
      setSelectedLangCode,
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

    expect(setSelectedLangCode).toHaveBeenCalledWith('en');
  });

  it('sets the language to nb (default) if no language is selected', async () => {
    const setSelectedLangCode = jest.fn((lang: string) => lang);
    renderTextEditor({
      setSelectedLangCode,
      selectedLangCode: undefined,
    });
    expect(setSelectedLangCode).toHaveBeenCalledWith('nb');
  });

  it.todo(
    'removes an entry from the rendered list of entries'
    /* async ()=>{
    const onDeleteLang = jest.fn();
    const { user } = renderTextEditor({
      onDeleteLang,
    });
    const result = screen.getAllByText(/Slett textId/i);
    expect(result).toHaveLength(2);
    await user.click(result[0]);
    expect(onDeleteLang).toHaveBeenCalledWith('meh');
  }*/
  );
  it.todo('syncs the textIds across languages');
});
