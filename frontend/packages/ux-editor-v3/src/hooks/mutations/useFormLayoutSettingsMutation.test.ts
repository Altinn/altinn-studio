import { queriesMock } from 'app-shared/mocks/queriesMock';
import { formLayoutSettingsMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFormLayoutSettingsMutation } from './useFormLayoutSettingsMutation';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;

describe('useFormLayoutSettingsMutation', () => {
  it('Calls saveFormLayoutV3Settings with correct arguments and payload', async () => {
    const settingsResult = renderHookWithMockStore()(() =>
      useFormLayoutSettingsMutation(org, app, selectedLayoutSet),
    ).renderHookResult.result;

    settingsResult.current.mutate(formLayoutSettingsMock);
    await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));

    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      org,
      app,
      selectedLayoutSet,
      formLayoutSettingsMock,
    );
  });
});
