import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { act, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { TextEditor } from './TextEditor';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import userEvent from '@testing-library/user-event';
import * as testids from '../../../testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';

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
    await render();

    expect(screen.getByText(testTextResourceKey)).toBeInTheDocument();
    expect(screen.getByText(testTextResourceValue)).toBeInTheDocument();
  });

  it('updates search query when searching text', async () => {
    const user = userEvent.setup();

    await render();

    const search = '1';
    const searchInput = screen.getByTestId('text-editor-search-default');
    await act(() => user.type(searchInput, search));

    expect(mockSetSearchParams).toHaveBeenCalledWith({ search });
  });

  it('adds new text resource when clicking add button', async () => {
    const user = userEvent.setup();

    await render();

    const addButton = screen.getByRole('button', { name: textMock('text_editor.new_text') });
    await act(() => user.click(addButton));

    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(2);
  });

  it('updates text resource when editing text', async () => {
    const user = userEvent.setup();

    await render();

    const textarea = screen.getByRole('textbox', { name: 'nb translation' });
    await act(() => user.clear(textarea));
    await act(() => user.type(textarea, 'test'));
    await act(() => user.tab());

    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, 'nb', {
      [testTextResourceKey]: 'test',
    });
  });

  it('updates text id when editing text id', async () => {
    const user = userEvent.setup();

    await render();

    const editButton = screen.getByRole('button', { name: 'toggle-textkey-edit' });
    await act(() => editButton.click());

    const textarea = screen.getByRole('textbox', { name: 'tekst key edit' });
    await act(() => user.clear(textarea));
    await act(() => user.type(textarea, 'test'));
    await act(() => user.tab());

    expect(queriesMock.updateTextId).toHaveBeenCalledWith(org, app, [
      { newId: 'test', oldId: testTextResourceKey },
    ]);
  });

  it('deletes text id when clicking delete button', async () => {
    const user = userEvent.setup();

    await render();

    const deleteButton = screen.getByRole('button', { name: textMock('schema_editor.delete') });
    act(() => deleteButton.click());

    const confirmButton = await screen.findByRole('button', {
      name: textMock('schema_editor.textRow-deletion-confirm'),
    });
    await act(() => user.click(confirmButton));

    expect(queriesMock.updateTextId).toHaveBeenCalledWith(org, app, [
      { oldId: testTextResourceKey },
    ]);
  });

  it('adds new language when clicking add button', async () => {
    const user = userEvent.setup();

    await render();

    const addBtn = screen.getByRole('button', {
      name: textMock('general.add'),
    });
    expect(addBtn).toBeDisabled();
    const select = screen.getByRole('combobox');

    await act(() => user.type(select, 'nordsamisk'));
    await act(() => user.click(screen.getByText('nordsamisk')));

    expect(addBtn).not.toBeDisabled();
    await act(() => user.click(addBtn));

    expect(queriesMock.addLanguageCode).toHaveBeenCalledWith(org, app, 'se', {
      language: 'se',
      resources: [{ id: testTextResourceKey, value: '' }],
    });
  });

  it('deletes a language when clicking delete button', async () => {
    const user = userEvent.setup();

    await render();

    const deleteButton = screen.getByTestId(testids.deleteButton('en'));
    await act(() => user.click(deleteButton));

    const confirmButton = await screen.findByRole('button', {
      name: textMock('schema_editor.language_confirm_deletion'),
    });
    await act(() => user.click(confirmButton));

    expect(queriesMock.deleteLanguageCode).toHaveBeenCalledWith(org, app, 'en');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders the spinner', () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    });
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  const view = renderWithProviders(<TextEditor />, {
    queries: {
      getTextResources,
      getTextLanguages,
      ...queries,
    },
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });

  await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

  return view;
};
