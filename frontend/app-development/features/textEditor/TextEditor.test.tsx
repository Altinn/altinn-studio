import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { act, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { TextEditor } from './TextEditor';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data
const org = 'test-org';
const app = 'test-app';
const testTextResourceKey = 'test-key';
const testTextResourceValue = 'test-value';

const queries: Partial<ServicesContextProps> = {
  deleteLanguageCode: jest.fn().mockImplementation(() => Promise.resolve()),
  upsertTextResources: jest.fn().mockImplementation(() => Promise.resolve()),
  getTextResources: jest.fn().mockImplementation(() => Promise.resolve({
    resources:[
      {
        id: testTextResourceKey,
        value: testTextResourceValue
      }
    ]
  })),
  getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(['nb', 'en'])),
};

const mockSetSearchParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => {
    return [
      new URLSearchParams({}),
      mockSetSearchParams
    ];
  }
}));

const mockLocalStorage = (() => {
  let store = jest.fn();
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = jest.fn();
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('TextEditor', () => {
  it('renders the component', async () => {
    await render();

    expect(screen.getByText(testTextResourceKey)).toBeInTheDocument();
    expect(screen.getByText(testTextResourceValue)).toBeInTheDocument();
  });

  it('updates search query when searching text', async () => {
    await render();

    const search = '1';
    const searchInput = screen.getByTestId('text-editor-search-default');
    await act(() => user.type(searchInput, search));

    expect(mockSetSearchParams).toHaveBeenCalledWith({ search });
  });

  it('adds a text resource when clicking "New text" button', async () => {
    await render();

    const addButton = screen.getByRole('button', { name: 'Ny tekst' });
    await act(() => user.click(addButton));

    expect(queries.upsertTextResources).toBeCalledTimes(2);
  });

  it('deletes a text resource when clicking delete button', async () => {
    await render();

    const deleteButton = screen.getByTestId('delete-en');
    await act(() => user.click(deleteButton));

    const confirmButton = await screen.findByRole('button', { name: textMock('schema_editor.language_confirm_deletion') });
    await act(() => user.click(confirmButton));

    expect(queries.deleteLanguageCode).toBeCalledWith(org, app, 'en');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders the spinner', () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    });
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('stores selected language in local storage', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(jest.fn());
    mockLocalStorage.setItem('selectedLanguages', JSON.stringify(['nb']));
    expect(console.error).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

const render = async () => {
  renderWithProviders(<TextEditor />, {
    queries,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });

  await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
};
