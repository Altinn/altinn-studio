import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { TextEditor } from './TextEditor';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import userEvent from '@testing-library/user-event';
import * as testids from '../../../testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data
const testTextResourceKey = 'test-key';
const testTextResourceValue = 'test-value';
const languages = ['nb', 'en'];

const getTextResources = jest.fn().mockImplementation(() =>
  Promise.resolve({
    resources: [
      {
        id: testTextResourceKey,
        value: testTextResourceValue,
      },
    ],
  }),
);
const getTextLanguages = jest.fn().mockImplementation(() => Promise.resolve(languages));

const mockSetSearchParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => {
    return [new URLSearchParams({}), mockSetSearchParams];
  },
}));

// Need to mock the scrollIntoView function
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('TextEditor', () => {
  afterEach(jest.clearAllMocks);

  it('renders the component', async () => {
    renderTextEditor();
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('text_editor.loading_page')));
    expect(screen.getByText(testTextResourceKey)).toBeInTheDocument();
    expect(screen.getByText(testTextResourceValue)).toBeInTheDocument();
  });

  it('updates search query when searching text', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const search = '1';
    const searchInput = screen.getByTestId('text-editor-search-default');
    await user.type(searchInput, search);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ search });
  });

  it('adds new text resource when clicking add button', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const addButton = screen.getByRole('button', { name: textMock('text_editor.new_text') });
    await user.click(addButton);

    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(2);
  });

  it('updates text resource when editing text', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const textarea = screen.getByRole('textbox', {
      name: textMock('text_editor.table_row_input_label', {
        lang: textMock('language.nb'),
        textKey: testTextResourceKey,
      }),
    });
    await user.clear(textarea);
    await user.type(textarea, 'test');
    await user.tab();

    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(testids.org, testids.app, 'nb', {
      [testTextResourceKey]: 'test',
    });
  });

  it('updates text id when editing text id', async () => {
    queryClientMock.setQueryData([QueryKey.LayoutNames, testids.org, testids.app], []);
    const user = userEvent.setup();
    renderTextEditor();

    const editButton = screen.getByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey: testTextResourceKey }),
    });
    await user.click(editButton);

    const textarea = screen.getByRole('textbox', {
      name: textMock('text_editor.key.edit', { textKey: testTextResourceKey }),
    });
    await user.clear(textarea);
    await user.type(textarea, 'test');
    await user.tab();

    expect(queriesMock.updateTextId).toHaveBeenCalledWith(testids.org, testids.app, [
      { newId: 'test', oldId: testTextResourceKey },
    ]);
  });

  it('deletes text id when clicking delete button', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
    await waitFor(() => deleteButton.click());

    const confirmButton = await screen.findByRole('button', {
      name: textMock('schema_editor.textRow-deletion-confirm'),
    });
    await user.click(confirmButton);

    expect(queriesMock.updateTextId).toHaveBeenCalledWith(testids.org, testids.app, [
      { oldId: testTextResourceKey },
    ]);
  });

  it('adds new language when clicking add button', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const addBtn = screen.getByRole('button', {
      name: textMock('general.add'),
    });
    expect(addBtn).toBeDisabled();
    const select = screen.getByRole('combobox');

    await user.type(select, 'nordsamisk');
    await user.click(screen.getByText('nordsamisk'));

    expect(addBtn).not.toBeDisabled();
    await user.click(addBtn);

    expect(queriesMock.addLanguageCode).toHaveBeenCalledWith(testids.org, testids.app, 'se', {
      language: 'se',
      resources: [{ id: testTextResourceKey, value: '' }],
    });
  });

  it('deletes a language when clicking delete button', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const deleteButton = screen.getByTestId(testids.deleteButton('en'));
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', {
      name: textMock('schema_editor.language_confirm_deletion'),
    });
    await user.click(confirmButton);

    expect(queriesMock.deleteLanguageCode).toHaveBeenCalledWith(testids.org, testids.app, 'en');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders the spinner', () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${testids.org}/${testids.app}`,
    });
    expect(screen.getByText(textMock('text_editor.loading_page'))).toBeInTheDocument();
  });
});

const renderTextEditor = (queries: Partial<ServicesContextProps> = {}) => {
  return renderWithProviders(<TextEditor />, {
    queryClient: queryClientMock,
    queries: {
      getTextResources,
      getTextLanguages,
      ...queries,
    },
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${testids.org}/${testids.app}`,
  });
};
