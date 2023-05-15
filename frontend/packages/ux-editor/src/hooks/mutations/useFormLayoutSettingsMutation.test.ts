import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { waitFor } from '@testing-library/react';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

describe('useFormLayoutSettingsMutation', () => {
  it('Calls saveFormLayoutSettings with correct arguments and payload', async () => {
    const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsMutation(org, app, selectedLayoutSet))
      .renderHookResult
      .result;

    const layoutSettings = {
      pages: {
        order: ['Side1', 'Side2']
      }
    };
    settingsResult.current.mutate(layoutSettings);
    await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));

    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      org,
      app,
      selectedLayoutSet,
      layoutSettings
    );
  });
});
