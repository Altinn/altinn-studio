import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useConfigureLayoutSetMutation } from './useConfigureLayoutSetMutation';
import { waitFor } from '@testing-library/react';

// Test data:
const org = 'org';
const app = 'app';
const layoutSetName = 'first-layout-set-name';

describe('useConfigureLayoutSetMutation', () => {
  it('Calls configureLayoutSet with correct arguments and payload', async () => {
    const configureLayoutSetResult = renderHookWithMockStore()(() =>
      useConfigureLayoutSetMutation(org, app),
    ).renderHookResult.result;
    await configureLayoutSetResult.current.mutateAsync({ layoutSetName });
    await waitFor(() => expect(configureLayoutSetResult.current.isSuccess).toBe(true));

    expect(queriesMock.configureLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.configureLayoutSet).toHaveBeenCalledWith(org, app, layoutSetName);
  });
});
