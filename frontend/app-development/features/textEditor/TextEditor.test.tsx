import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { TextEditor } from './TextEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import userEvent from '@testing-library/user-event';
import { deleteButtonId } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { QueryClient } from '@tanstack/react-query';
import type { ITextResources } from 'app-shared/types/global';

// Test data
const org = 'test-org';
const app = 'test-app';
const testTextResourceKey = 'test-key';
const testTextResourceValue = 'test-value';
const language1 = 'nb';
const language2 = 'en';
const languages = [language1, language2];

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

    renderTextEditorWithData();

    const search = '1';
    const searchInput = screen.getByRole('searchbox', {
      name: textMock('text_editor.search_for_text'),
    });
    await user.type(searchInput, search);

    expect(mockSetSearchParams).toHaveBeenCalledWith({ search });
  });

  it('adds new text resource when clicking add button', async () => {
    const user = userEvent.setup();

    renderTextEditorWithData();

    const addButton = screen.getByRole('button', { name: textMock('text_editor.new_text') });
    await user.click(addButton);

    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(2);
  });

  it('updates text resource when editing text', async () => {
    const user = userEvent.setup();

    renderTextEditorWithData();

    const textarea = screen.getByRole('textbox', {
      name: textMock('text_editor.table_row_input_label', {
        lang: textMock('language.nb'),
        textKey: testTextResourceKey,
      }),
    });
    await user.clear(textarea);
    await user.type(textarea, 'test');
    await user.tab();

    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, 'nb', {
      [testTextResourceKey]: 'test',
    });
  });

  it('updates text id when editing text id', async () => {
    const queryClient = createQueryClientWithData();
    queryClient.setQueryData([QueryKey.LayoutNames, org, app], []);
    const user = userEvent.setup();
    renderTextEditor({}, queryClient);

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

    expect(queriesMock.updateTextId).toHaveBeenCalledWith(org, app, [
      { newId: 'test', oldId: testTextResourceKey },
    ]);
  });

  it('deletes text id when clicking delete button', async () => {
    const user = userEvent.setup();

    renderTextEditorWithData();

    const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
    await waitFor(() => deleteButton.click());

    const confirmButton = await screen.findByRole('button', {
      name: textMock('schema_editor.textRow-deletion-confirm'),
    });
    await user.click(confirmButton);

    expect(queriesMock.updateTextId).toHaveBeenCalledWith(org, app, [
      { oldId: testTextResourceKey },
    ]);
  });

  it('adds new language when clicking add button', async () => {
    const user = userEvent.setup();

    renderTextEditorWithData();

    const addBtn = screen.getByRole('button', {
      name: textMock('general.add'),
    });
    expect(addBtn).toBeDisabled();
    const select = screen.getByRole('combobox');

    await user.selectOptions(select, screen.getByRole('option', { name: 'nordsamisk' }));

    expect(addBtn).not.toBeDisabled();
    await user.click(addBtn);

    expect(queriesMock.addLanguageCode).toHaveBeenCalledWith(org, app, 'se', {
      language: 'se',
      resources: [{ id: testTextResourceKey, value: '' }],
    });
  });

  it('deletes a language when clicking delete button', async () => {
    const user = userEvent.setup();

    renderTextEditorWithData();

    const deleteButton = screen.getByTestId(deleteButtonId('en'));
    await user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', {
      name: textMock('schema_editor.language_confirm_deletion'),
    });
    await user.click(confirmButton);

    expect(queriesMock.deleteLanguageCode).toHaveBeenCalledWith(org, app, 'en');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders the spinner', () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    });
    expect(screen.getByText(textMock('text_editor.loading_page'))).toBeInTheDocument();
  });
});

const renderTextEditor = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  return renderWithProviders(<TextEditor />, {
    queryClient,
    queries: {
      getTextResources,
      getTextLanguages,
      ...queries,
    },
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};

function renderTextEditorWithData(): void {
  const queryClient = createQueryClientWithData();
  renderTextEditor({}, queryClient);
}

function createQueryClientWithData(): QueryClient {
  const data: ITextResources = {
    [language1]: [{ id: testTextResourceKey, value: testTextResourceValue }],
    [language2]: [],
  };
  const queryClient: QueryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TextResources, org, app], data);
  queryClient.setQueryData([QueryKey.TextLanguages, org, app], languages);
  return queryClient;
}
