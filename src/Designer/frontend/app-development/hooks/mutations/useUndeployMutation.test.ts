import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { useUndeployMutation } from './useUndeployMutation';

// Test data:
const environment = 'production';

describe('useUndeployMutation', () => {
  it('Calls undeployAppFromEnv with correct arguments and payload', async () => {
    const useUndeployMutationResult = renderHookWithProviders()(() => useUndeployMutation(org, app))
      .renderHookResult.result;

    await waitFor(() =>
      useUndeployMutationResult.current.mutateAsync({
        environment,
      }),
    );

    expect(useUndeployMutationResult.current.isSuccess).toBe(true);
    expect(queriesMock.undeployAppFromEnv).toHaveBeenCalledTimes(1);
    expect(queriesMock.undeployAppFromEnv).toHaveBeenCalledWith(org, app, environment);
  });
});
