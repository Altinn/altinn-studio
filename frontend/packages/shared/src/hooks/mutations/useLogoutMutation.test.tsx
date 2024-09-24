import React from 'react';
import { renderHook } from '@testing-library/react';
import { useLogoutMutation } from './useLogoutMutation';
import { ServicesContextProvider } from '../../contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';

describe('useLogoutMutation', () => {
  test('Calls logout and redirects to the correct path on success', async () => {
    const mockLogout = jest.fn();

    Object.defineProperty(window, 'location', {
      value: { assign: mockLogout },
      writable: true,
    });

    const { result } = renderLogoutMutation();

    await result.current.mutateAsync();

    expect(queriesMock.logout).toHaveBeenCalledTimes(1);
    expect(mockLogout).toHaveBeenCalledWith('/Home/Logout');
  });
});

const renderLogoutMutation = () => {
  const client = createQueryClientMock();
  return renderHook(() => useLogoutMutation(), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={client}>
        {children}
      </ServicesContextProvider>
    ),
  });
};
