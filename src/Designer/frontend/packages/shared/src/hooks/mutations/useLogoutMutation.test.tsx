import { useLogoutMutation } from './useLogoutMutation';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

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
  return renderHookWithProviders(() => useLogoutMutation());
};
