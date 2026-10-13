import { describe, expect, it, vi } from 'vitest';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { OrgInactivityUndeploySettings } from 'app-shared/types/OrgInactivityUndeploySettings';
import { renderHookWithProviders } from '../../../../../testing/mocks';
import { useUpdateInactivityUndeploySettingsMutation } from './useUpdateInactivityUndeploySettingsMutation';

const testOrg = 'ttd';
const settings: OrgInactivityUndeploySettings = {
  undeployOnInactivity: false,
  inactivityPeriodDays: 60,
};

const renderUseUpdateInactivityUndeploySettingsMutation = (queryClient = createQueryClientMock()) =>
  renderHookWithProviders(() => useUpdateInactivityUndeploySettingsMutation(testOrg), {
    queryClient,
  });

describe('useUpdateInactivityUndeploySettingsMutation', () => {
  it('calls updateOrgInactivityUndeploySettings with the correct arguments', async () => {
    const { result } = renderUseUpdateInactivityUndeploySettingsMutation();
    await result.current.mutateAsync(settings);
    expect(queriesMock.updateOrgInactivityUndeploySettings).toHaveBeenCalledWith(testOrg, settings);
  });

  it('invalidates the inactivity undeploy settings query on success', async () => {
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseUpdateInactivityUndeploySettingsMutation(queryClient);
    await result.current.mutateAsync(settings);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [QueryKey.OrgInactivityUndeploySettings, testOrg] }),
    );
  });
});
