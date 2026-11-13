import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useUserPlatformPermissionsQuery } from './useUserPlatformPermissionsQuery';

describe('useUserPlatformPermissionsQuery', () => {
  it('asks the backend whether the user has platform access', async () => {
    const { result } = renderHookWithProviders(() => useUserPlatformPermissionsQuery());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.getUserPlatformPermissions).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ hasPlatformAccess: false });
  });
});
