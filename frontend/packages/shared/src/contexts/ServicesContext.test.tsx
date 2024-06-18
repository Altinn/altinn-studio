import React, { type ReactNode } from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ServicesContextProps } from './ServicesContext';
import { ServicesContextProvider, useServicesContext } from './ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useQuery } from '@tanstack/react-query';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { userLogoutAfterPath } from 'app-shared/api/paths';

const unknownErrorCode = 'unknownErrorCode';
// Mocks:
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, variables?: KeyValuePairs<string>) => textMock(key, variables),
    i18n: {
      exists: (key: string) =>
        key !== `api_errors.${unknownErrorCode}` ? textMock(key) : undefined,
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: any }) => textMock(i18nKey),
}));

jest.useFakeTimers();

const wrapper = ({
  children,
  queries = {},
}: {
  children: ReactNode;
  queries?: Partial<ServicesContextProps>;
}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  return <ServicesContextProvider {...allQueries}>{children}</ServicesContextProvider>;
};

describe('ServicesContext', () => {
  it('Display the unauthorized error message ', async () => {
    renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(401)),
          retry: false,
        }),
      {
        wrapper: ({ children }) => {
          return wrapper({ children });
        },
      },
    );
    expect(await screen.findByText(textMock('api_errors.Unauthorized'))).toBeInTheDocument();
  });

  it('logs the user out after displaying a toast for a given time when the api says unauthorized', async () => {
    jest.spyOn(global, 'setTimeout');
    const mockAssign = jest.fn();
    delete window.location;
    window.location = { assign: mockAssign } as any;
    renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(401)),
          retry: false,
        }),
      {
        wrapper: ({ children }) => {
          return wrapper({ children });
        },
      },
    );
    expect(await screen.findByText(textMock('api_errors.Unauthorized'))).toBeInTheDocument();
    jest.runAllTimers();
    await waitFor(async () => {
      await Promise.resolve();
    });
    jest.advanceTimersByTime(6000);
    await waitFor(() => {
      setTimeout(() => {
        expect(queriesMock.logout).toHaveBeenCalledTimes(1);
      }, 5000);
    });

    await waitFor(() => {
      setTimeout(() => {
        expect(mockAssign).toHaveBeenCalledWith('/logout');
      }, 5000);
    });

    await waitFor(() => {
      setTimeout(() => {
        expect(mockAssign).toHaveBeenCalledWith(userLogoutAfterPath());
      }, 5000);
    });
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
    expect(await screen.findByText(textMock('api_errors.GT_01'))).toBeInTheDocument();
  });

  it('displays a specific error message if API returns error code DM_01', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(422, 'DM_01')),
          retry: false,
        }),
      { wrapper },
    );

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(textMock('api_errors.DM_01'))).toBeInTheDocument();
  });

  it('displays a specific error message if API returns error code DM_03', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(422, 'DM_03')),
          retry: false,
        }),
      { wrapper },
    );

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(textMock('api_errors.DM_03'))).toBeInTheDocument();
  });

  it('displays a specific error message if API returns error code DM_05', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(400, 'DM_05')),
          retry: false,
        }),
      { wrapper },
    );

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(textMock('api_errors.DM_05'))).toBeInTheDocument();
  });

  it('displays a default error message if API returns an error code but the error message does not exist', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['fetchData'],
          queryFn: () => Promise.reject(createApiErrorMock(500, unknownErrorCode)),
          retry: false,
        }),
      { wrapper },
    );

    await waitFor(() => result.current.isError);

    expect(
      await screen.findByText((content, element) =>
        content.includes(textMock('general.error_message')),
      ),
    ).toBeInTheDocument();
  });

  it('displays a default error message if an API call fails', async () => {
    const { result } = renderHook(
      () => useQuery({ queryKey: ['fetchData'], queryFn: () => Promise.reject(), retry: false }),
      { wrapper },
    );

    await waitFor(() => result.current.isError);

    expect(await screen.findByText(textMock('general.error_message'))).toBeInTheDocument();
  });

  it('displays a default error message if a component throws an error while rendering', () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    const ErrorComponent = () => {
      throw new Error('Intentional render error');
    };
    render(<ErrorComponent />, { wrapper });

    expect(screen.getByText(textMock('general.error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.try_again'))).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('Throws an error if used outside a ServiceContextProvider', () => {
    const renderHookFn = () => renderHook(() => useServicesContext());
    jest.spyOn(console, 'error').mockImplementation();
    expect(renderHookFn).toThrowError(
      'useServicesContext must be used within a ServicesContextProvider.',
    );
  });
});
