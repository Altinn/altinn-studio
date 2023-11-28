import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { ServicesContextProps, ServicesContextProvider } from './ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useQuery } from '@tanstack/react-query';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

const texts = {
  'api_errors.DM_01': 'DM_01 error message',
  'api_errors.GT_01': 'Deling av endringer mislyktes. Vennligst prøv igjen.',
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

const wrapper = ({
  children,
  queries = {},
}: {
  children: React.JSX.Element;
  queries: Partial<ServicesContextProps>;
}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  return <ServicesContextProvider {...allQueries}>{children}</ServicesContextProvider>;
};

describe('ServicesContext', () => {
  it('logs the user out when the session is invalid or expired', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    const logout = jest.fn().mockImplementation(() => Promise.resolve());

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(401)),
          retry: false,
        }),
      {
        wrapper: ({ children }) => {
          return wrapper({ children, queries: { logout } });
        },
      },
    );

    await waitFor(() => result.current.isError);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('Displays a toast message for "GT_01" error code', async () => {
    const errorCode = 'GT_01';
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(409, errorCode)),
          retry: false,
        }),
      { wrapper },
    );
    await waitFor(() => result.current.isError);
    expect(await screen.findByText(texts['api_errors.GT_01'])).toBeInTheDocument();
  });

  it('displays a specific error message if API returns an error code and the error messages does exist', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(500, 'DM_01')),
          retry: false,
        }),
      { wrapper },
    );

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(texts['api_errors.DM_01'])).toBeInTheDocument();
  });

  it('displays a default error message if API returns an error code but the error message does not exist', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(500, 'DM_02')),
          retry: false,
        }),
      { wrapper },
    );

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(texts['general.error_message'])).toBeInTheDocument();
  });

  it('displays a default error message if an API call fails', async () => {
    const { result } = renderHook(
      () => useQuery({ queryKey: ['fetchData'], queryFn: () => Promise.reject(), retry: false }),
      { wrapper },
    );

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(texts['general.error_message'])).toBeInTheDocument();
  });

  it('displays a default error message if a component throws an error while rendering', () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    const ErrorComponent = () => {
      throw new Error('Intentional render error');
    };
    render(<ErrorComponent />, { wrapper });

    expect(screen.getByText(texts['general.error_message'])).toBeInTheDocument();
    expect(screen.getByText(texts['general.try_again'])).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
  });
});
