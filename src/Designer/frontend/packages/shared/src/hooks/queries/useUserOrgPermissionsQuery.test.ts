import { waitFor } from '@testing-library/react';
import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useUserOrgPermissionsQuery } from './useUserOrgPermissionsQuery';

describe('useUserOrgPermissionsQuery', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls getUserOrgPermissions with the selected organization', async () => {
    const org = 'ttd';
    const { result } = renderHookWithProviders(() => useUserOrgPermissionsQuery(org));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.getUserOrgPermissions).toHaveBeenCalledWith(org);
  });

  it('does not call getUserOrgPermissions when query is disabled', async () => {
    renderHookWithProviders(() => useUserOrgPermissionsQuery('ttd', { enabled: false }));

    await waitFor(() => expect(queriesMock.getUserOrgPermissions).not.toHaveBeenCalled());
  });
});
