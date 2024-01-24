import React from 'react';
import { TextEditor } from './TextEditor';
import type { TextEditorProps } from './TextEditor';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import * as testids from '../../../testing/testids';

const user = userEvent.setup();
let mockScrollIntoView = jest.fn();

describe('TextEditor', () => {
  const textId1 = 'textId1';
  const textId2 = 'a-textId2';
  const textValue1 = 'norsk-1';
  const textValue2 = 'norsk-2';
  const nb: ITextResource[] = [
    {
      id: textId1,
      value: textValue1,
    },
    {
      id: textId2,
      value: textValue2,
    },
  ];
  const textResourceFiles: ITextResources = { nb };

  const renderTextEditor = (props: Partial<TextEditorProps> = {}) => {
    const defaultProps: TextEditorProps = {
      addLanguage: jest.fn(),
      availableLanguages: ['nb', 'en'],
      deleteLanguage: jest.fn(),
      searchQuery: undefined,
      selectedLangCodes: ['nb'],
      setSearchQuery: jest.fn(),
      setSelectedLangCodes: jest.fn(),
      textResourceFiles,
      updateTextId: jest.fn(),
      upsertTextResource: jest.fn(),
    };
    return rtlRender(<TextEditor {...defaultProps} {...props} />);
  };
  beforeEach(() => {
    // Need to mock the scrollIntoView function
    mockScrollIntoView = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;
  });

  it('fires upsertTextResource when Add new is clicked', async () => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0);

    const upsertTextResource = jest.fn();
    renderTextEditor({
      upsertTextResource,
    });
    const addBtn = screen.getByRole('button', {
      name: textMock('text_editor.new_text'),
    });

    await act(() => user.click(addBtn));

    expect(upsertTextResource).toHaveBeenCalledWith({
      language: 'nb',
      textId: 'id_1000',
      translation: '',
    });
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('fires onDeleteLang when Delete lang is clicked', async () => {
    const handleDeleteLang = jest.fn();
    renderTextEditor({
      deleteLanguage: handleDeleteLang,
    });
    const deleteBtn = screen.getByTestId(testids.deleteButton('en'));

    await act(() => user.click(deleteBtn));
    await screen.findByRole('dialog');
    await act(() =>
      user.click(
        screen.getByRole('button', {
          name: textMock('schema_editor.language_confirm_deletion'),
        }),
      ),
    );

    expect(handleDeleteLang).toHaveBeenCalledWith('en');
  });

  it('removes nb from selectedLanguages when delete lang is clicked', async () => {
    const setSelectedLangCodes = jest.fn((langs: string[]) => langs);
    const handleDeleteLang = jest.fn();
    renderTextEditor({
      selectedLangCodes: ['nb', 'en'],
      setSelectedLangCodes: setSelectedLangCodes,
      deleteLanguage: handleDeleteLang,
    });
    const deleteBtn = screen.getByTestId(testids.deleteButton('en'));

    await act(() => user.click(deleteBtn));
    await screen.findByRole('dialog');
    await act(() =>
      user.click(
        screen.getByRole('button', {
          name: textMock('schema_editor.language_confirm_deletion'),
        }),
      ),
    );

    expect(handleDeleteLang).toHaveBeenCalledWith('en');
    expect(setSelectedLangCodes).toHaveBeenCalledWith(['nb']);
  });

  it('calls setSelectedLang code when lang is changed', async () => {
    const setSelectedLangCodes = jest.fn((langs: string[]) => langs);
    renderTextEditor({
      setSelectedLangCodes: setSelectedLangCodes,
    });
    const norwegianCheckbox = screen.getByRole('checkbox', {
      name: /norsk bokmål/i,
    });
    const englishCheckbox = screen.getByRole('checkbox', {
      name: /engelsk/i,
    });
    expect(norwegianCheckbox).toBeChecked();
    expect(englishCheckbox).not.toBeChecked();

    await act(() => user.click(englishCheckbox));

    expect(setSelectedLangCodes).toHaveBeenCalledWith(['nb', 'en']);
  });

  it('Calls ScrollIntoView when a new languages is selected', async () => {
    renderTextEditor({
      availableLanguages: ['nb', 'en', 'tw', 'ku'],
      selectedLangCodes: ['nb', 'en', 'tw'],
    });
    const kurdishCheckbox = screen.getByRole('checkbox', {
      name: /kurdisk/i,
    });
    await act(() => user.click(kurdishCheckbox));

    expect(mockScrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('Sorts texts when sort chip is clicked', async () => {
    renderTextEditor({});
    const translations = screen.getAllByRole('textbox', {
      name: 'nb translation',
    });
    expect(translations[0]).toHaveValue(textValue1);

    const sortAlphabeticallyButton = screen.getByText(textMock('text_editor.sort_alphabetically'));
    await act(() => user.click(sortAlphabeticallyButton));

    const sortedTranslations = screen.getAllByRole('textbox', {
      name: 'nb translation',
    });
    expect(sortedTranslations[0]).toHaveValue(textValue2);
  });

  it('signals correctly when a translation is changed', async () => {
    const upsertTextResource = jest.fn();
    renderTextEditor({
      upsertTextResource,
    });
    const translationsToChange = screen.getAllByRole('textbox', {
      name: 'nb translation',
    });
    expect(translationsToChange).toHaveLength(2);
    const changedTranslations = nb;
    changedTranslations[0].value = 'new translation';
    await act(() => user.tripleClick(translationsToChange[0]));
    await act(() => user.keyboard(`${changedTranslations[0].value}{TAB}`));
    expect(upsertTextResource).toHaveBeenCalledWith({
      language: 'nb',
      textId: textId1,
      translation: 'new translation',
    });
  });

  describe('text-id mutation', () => {
    const deleteSomething = async (onTextIdChange = jest.fn()) => {
      renderTextEditor({
        updateTextId: onTextIdChange,
      });
      const result = screen.getAllByRole('button', {
        name: textMock('schema_editor.delete'),
      });
      expect(result).toHaveLength(2);

      await act(() => user.click(result[0]));
      await screen.findByRole('dialog');
      await act(() =>
        user.click(
          screen.getByRole('button', {
            name: textMock('schema_editor.textRow-deletion-confirm'),
          }),
        ),
      );

      await expect(onTextIdChange).toHaveBeenCalledWith({ oldId: nb[0].id });
    };

    const getInputs = (name: RegExp) => screen.getAllByRole('textbox', { name });

    const makeChangesToTextIds = async (onTextIdChange = jest.fn()) => {
      renderTextEditor({
        updateTextId: onTextIdChange,
      });

      const editKeyButton = await screen.getAllByRole('button', {
        name: 'toggle-textkey-edit',
      })[0];
      await act(() => user.click(editKeyButton));

      const textIdInputs = getInputs(/tekst key edit/i);
      expect(textIdInputs).toHaveLength(1);
      await user.tripleClick(textIdInputs[0]); // select all text
      await act(() => user.keyboard('new-key{TAB}')); // type new text and blur

      await expect(onTextIdChange).toHaveBeenCalledWith({
        oldId: nb[0].id,
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

    it('signals that a textId has changed', async () => {
      await makeChangesToTextIds();
      const textIdRefsAfter1 = screen.getAllByText(textId2);
      expect(textIdRefsAfter1).toHaveLength(1); // The id is also on the delete button
    });

    it('removes an entry from the rendered list of entries', () => deleteSomething());

    it('reverts the text-id if there was an error on change', async () => {
      const { error, onTextIdChange } = setupError();
      const original = await makeChangesToTextIds(onTextIdChange);
      expect(error).toHaveBeenCalledWith('Renaming text-id failed:\n', 'some error');
      const textIdRefsAfter1 = screen.getAllByText(textId2);
      expect(textIdRefsAfter1).toHaveLength(1);

      const textIdRefsAfter2 = screen.queryAllByText(/new-key/i);
      expect(textIdRefsAfter2).toHaveLength(0);
      expect(getInputs(/tekst key edit/i)).toEqual(original);
    });

    it('reverts to the previous IDs if an entry could not be deleted', async () => {
      const { error, onTextIdChange } = setupError();
      await deleteSomething(onTextIdChange);
      expect(error).toHaveBeenCalledWith('Deleting text failed:\n', 'some error');
      const resultAfter = screen.getAllByRole('button', {
        name: textMock('schema_editor.delete'),
      });
      expect(resultAfter).toHaveLength(2);
    });
  });
});
