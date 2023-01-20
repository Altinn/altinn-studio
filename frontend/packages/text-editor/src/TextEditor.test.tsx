import React from 'react';
import { TextEditor } from './TextEditor';
import type { TextEditorProps } from './TextEditor';
import { act, render as rtlRender, screen } from '@testing-library/react';
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
      searchQuery: undefined,
      setSelectedLangCode: jest.fn(),
      setSearchQuery: jest.fn(),
      onAddLang: jest.fn(),
      onTranslationChange: jest.fn(),
      onDeleteLang: jest.fn(),
      onTextIdChange: jest.fn(),
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

    await act(() => user.click(addBtn));

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

    await act(() => user.click(deleteBtn));

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

    await act(() => user.click(englishRadio));

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
  it('signals correctly when a translation is changed', async () => {
    const onTranslationChange = jest.fn();
    const { user } = renderTextEditor({
      onTranslationChange,
    });
    const translationsToChange = screen.getAllByRole('textbox', {
      name: /norsk bokmål/i,
    });
    expect(translationsToChange).toHaveLength(2);
    await user.tripleClick(translationsToChange[0]); // select all text
    const changedTranslations = [...norwegianTranslation.resources];
    changedTranslations[0].value = 'new translation';
    await user.keyboard(`${changedTranslations[0].value}{TAB}`); // type new text and blur
    const mutatedTranslation = { ...norwegianTranslation, resources: changedTranslations };
    expect(onTranslationChange).toHaveBeenCalledWith(mutatedTranslation);
  });

  describe('text-id mutation', () => {
    const deleteSomething = async (onTextIdChange = jest.fn()) => {
      const { user } = renderTextEditor({
        onTextIdChange,
      });
      const result = screen.getAllByRole('button', {
        name: /Slett textId/i,
      });
      expect(result).toHaveLength(2);
      await user.click(result[0]);
      expect(onTextIdChange).toHaveBeenCalledWith({ oldId: norwegianTranslation.resources[0].id });
    };
    const getInputs = (name: RegExp) => screen.getAllByRole('textbox', { name });
    const makeChangesToTextIds = async (onTextIdChange = jest.fn()) => {
      const { user } = renderTextEditor({
        onTextIdChange,
      });
      const textIdInputs = getInputs(/ID/i);
      expect(textIdInputs).toHaveLength(2);
      await user.tripleClick(textIdInputs[0]); // select all text
      await user.keyboard('new-key{TAB}'); // type new text and blur
      expect(onTextIdChange).toHaveBeenCalledWith({
        oldId: norwegianTranslation.resources[0].id,
        newId: 'new-key',
      });
      return textIdInputs;
    };
    const setupError = () => {
      const error = jest.spyOn(console, 'error').mockImplementation();
      const onTextIdChange = jest.fn(() => {
        throw 'some error';
      });
      return { error, onTextIdChange };
    };
    it('removes an entry from the rendered list of entries', async () => {
      await deleteSomething();
      const resultAfter = screen.getAllByRole('button', {
        name: /Slett textId/i,
      });
      expect(resultAfter).toHaveLength(1);
    });
    it('signals that a textId has changed', async () => {
      await makeChangesToTextIds();
      const textIdRefsAfter1 = screen.getAllByText(/textid/i);
      const textIdRefsAfter2 = screen.getAllByText(/new-key/i);
      expect(textIdRefsAfter1).toHaveLength(2); // The id is also on the delete button
      expect(textIdRefsAfter2).toHaveLength(2);
    });
    it('reverts the text-id if there was an error on change', async () => {
      const { error, onTextIdChange } = setupError();
      const original = await makeChangesToTextIds(onTextIdChange);
      expect(error).toHaveBeenCalledWith('Renaming text-id failed:\n', 'some error');
      const textIdRefsAfter1 = screen.getAllByText(/textid/i);
      const textIdRefsAfter2 = screen.queryAllByText(/new-key/i);
      expect(textIdRefsAfter1).toHaveLength(4); // The id is also on the delete button
      expect(textIdRefsAfter2).toHaveLength(0);
      expect(getInputs(/ID/i)).toEqual(original);
    });
    it('reverts to the previous IDs if an entry could not be deleted', async () => {
      const { error, onTextIdChange } = setupError();
      await deleteSomething(onTextIdChange);
      expect(error).toHaveBeenCalledWith('Deleting text failed:\n', 'some error');
      const resultAfter = screen.getAllByRole('button', {
        name: /Slett textId/i,
      });
      expect(resultAfter).toHaveLength(2);
    });
  });
});
