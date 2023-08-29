import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { ServicesContextProvider } from './ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useQuery } from '@tanstack/react-query';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';

const texts = {
  'api_errors.DM_01': 'DM_01 error message',
  'general.error_message': 'Something went wrong',
  'general.try_again': 'Try again',
};

// Mocks:
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    ...mockUseTranslation(texts),
    i18n: {
      exists: (key: string) => texts[key] !== undefined,
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: any }) => texts[i18nKey],
}));

const wrapper = ({ children }) => (
  <ServicesContextProvider {...queriesMock}>
    {children}
  </ServicesContextProvider>
);

describe('ServicesContext', () => {
  it('displays a specific error message if API returns an error code and the error messages does exist', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useQuery(['fetchData'],() => Promise.reject({
      response: {
        data: {
          errorCode: 'DM_01',
        }
      }
    }), { retry: false }), { wrapper });

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(texts['api_errors.DM_01'])).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('displays a default error message if API returns an error code but the error message does not exist', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useQuery(['fetchData'],() => Promise.reject({
      response: {
        data: {
          errorCode: 'DM_02',
        }
      }
    }), { retry: false }), { wrapper });

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(texts['general.error_message'])).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('displays a default error message if an API call fails', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useQuery(['fetchData'],() => Promise.reject(), { retry: false }), { wrapper });

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(texts['general.error_message'])).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('displays a default error message if a component throws an error while rendering', () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    const ErrorComponent = () => { throw new Error('Intentional render error'); };
    render(<ErrorComponent />, { wrapper });

    expect(screen.getByText(texts['general.error_message'])).toBeInTheDocument();
    expect(screen.getByText(texts['general.try_again'])).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
  });
});
