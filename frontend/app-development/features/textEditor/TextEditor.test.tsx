import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { screen } from '@testing-library/react';
import React from 'react';
import { TextEditor } from './TextEditor';
import { textMock } from '../../../testing/mocks/i18nMock';

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
  it('should render the spinner', () => {
    renderWithProviders(<TextEditor />, {
      startUrl: `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`,
    });
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  }); 
 
  it('should store selected language in local storage', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    consoleErrorSpy.mockImplementation(jest.fn());
    mockLocalStorage.setItem('selectedLanguages', JSON.stringify(['nb']));
    expect(console.error).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
