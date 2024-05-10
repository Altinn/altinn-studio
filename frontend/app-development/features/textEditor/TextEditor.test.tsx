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
const org = 'test-org';
const app = 'test-app';
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
    user.type(searchInput, search);

    await waitFor(() => expect(mockSetSearchParams).toHaveBeenCalledWith({ search }));
  });

  it('adds new text resource when clicking add button', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const addButton = screen.getByRole('button', { name: textMock('text_editor.new_text') });
    user.click(addButton);

    await waitFor(() => expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(2));
  });

  it('updates text resource when editing text', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const textarea = await screen.findByRole('textbox', {
      name: textMock('text_editor.table_row_input_label', {
        lang: textMock('language.nb'),
        textKey: testTextResourceKey,
      }),
    });
    await waitFor(() => user.clear(textarea));
    await waitFor(() => user.type(textarea, 'test'));
    user.tab();

    await waitFor(() =>
      expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, 'nb', {
        [testTextResourceKey]: 'test',
      }),
    );
  });

  it('updates text id when editing text id', async () => {
    queryClientMock.setQueryData([QueryKey.LayoutNames, org, app], []);
    const user = userEvent.setup();
    renderTextEditor();

    const editButton = screen.getByRole('button', {
      name: textMock('text_editor.toggle_edit_mode', { textKey: testTextResourceKey }),
    });
    user.click(editButton);

    const textarea = await screen.findByRole('textbox', {
      name: textMock('text_editor.key.edit', { textKey: testTextResourceKey }),
    });

    await waitFor(() => user.clear(textarea));
    await waitFor(() => user.type(textarea, 'test'));
    user.tab();

    await waitFor(() =>
      expect(queriesMock.updateTextId).toHaveBeenCalledWith(org, app, [
        { newId: 'test', oldId: testTextResourceKey },
      ]),
    );
  });

  it('deletes text id when clicking delete button', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const deleteButton = await screen.findByRole('button', {
      name: textMock('schema_editor.delete'),
    });
    user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', {
      name: textMock('schema_editor.textRow-deletion-confirm'),
    });
    user.click(confirmButton);

    await waitFor(() =>
      expect(queriesMock.updateTextId).toHaveBeenCalledWith(org, app, [
        { oldId: testTextResourceKey },
      ]),
    );
  });

  it('adds new language when clicking add button', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const addBtn = screen.getByRole('button', {
      name: textMock('general.add'),
    });
    expect(addBtn).toBeDisabled();
    const select = screen.getByRole('combobox');

    user.type(select, 'nordsamisk');
    user.click(await screen.findByText('nordsamisk'));

    await waitFor(() => expect(addBtn).not.toBeDisabled());
    user.click(addBtn);

    await waitFor(() =>
      expect(queriesMock.addLanguageCode).toHaveBeenCalledWith(org, app, 'se', {
        language: 'se',
        resources: [{ id: testTextResourceKey, value: '' }],
      }),
    );
  });

  it('deletes a language when clicking delete button', async () => {
    const user = userEvent.setup();

    renderTextEditor();

    const deleteButton = screen.getByTestId(testids.deleteButton('en'));
    user.click(deleteButton);

    const confirmButton = await screen.findByRole('button', {
      name: textMock('schema_editor.language_confirm_deletion'),
    });
    user.click(confirmButton);

    await waitFor(() =>
      expect(queriesMock.deleteLanguageCode).toHaveBeenCalledWith(org, app, 'en'),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the spinner', () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
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
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
