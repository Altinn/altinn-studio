import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { act, screen, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { TextEditor } from './TextEditor';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data
const org = 'test-org';
const app = 'test-app';
const testTextResourceKey = 'test-key';
const testTextResourceValue = 'test-value';

const mockQueries: ServicesContextProps = {
  ...queriesMock,
  getTextResources: jest.fn().mockImplementation(() => Promise.resolve({
    resources:[
      {
        id: testTextResourceKey,
        value: testTextResourceValue
      }
    ]
  })),
  getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(['nb'])),
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
    render(mockQueries);
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

    expect(screen.getByText(testTextResourceKey)).toBeInTheDocument();
    expect(screen.getByText(testTextResourceValue)).toBeInTheDocument();
  });

  it('updates search query when searching text', async () => {
    render(mockQueries);
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));

    const search = '1';
    const searchInput = screen.getByTestId('text-editor-search-default');
    await act(() => user.type(searchInput, search));
    expect(mockSetSearchParams).toHaveBeenCalledWith({ search });
  });

  it('renders the spinner', () => {
    render();
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

const render = (queries: Partial<ServicesContextProps> = {}) => {
  renderWithProviders(<TextEditor />, {
    queries,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
