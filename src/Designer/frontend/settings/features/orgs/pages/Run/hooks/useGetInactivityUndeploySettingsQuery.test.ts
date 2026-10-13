import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../../../../testing/mocks';
import { useGetInactivityUndeploySettingsQuery } from './useGetInactivityUndeploySettingsQuery';

const testOrg = 'ttd';

describe('useGetInactivityUndeploySettingsQuery', () => {
  it('calls getOrgInactivityUndeploySettings with the correct org', async () => {
    const { result } = renderHookWithProviders(() =>
      useGetInactivityUndeploySettingsQuery(testOrg),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.getOrgInactivityUndeploySettings).toHaveBeenCalledWith(testOrg);
  });
});
