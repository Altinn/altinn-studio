import { queriesMock } from 'app-shared/mocks/queriesMock';
import { formLayoutSettingsMock, renderHookWithProviders } from '../../testing/mocks';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { waitFor } from '@testing-library/react';
import { appContextMock } from '../../testing/appContextMock';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

describe('useFormLayoutSettingsMutation', () => {
  it('Calls saveFormLayoutSettings with correct arguments and payload', async () => {
    const settingsResult = renderHookWithProviders(() =>
      useFormLayoutSettingsMutation(org, app, selectedLayoutSet),
    ).result;

    settingsResult.current.mutate(formLayoutSettingsMock);
    await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));

    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      org,
      app,
      selectedLayoutSet,
      formLayoutSettingsMock,
    );
    expect(appContextMock.refetchLayoutSettings).toHaveBeenCalledTimes(1);
  });
});
