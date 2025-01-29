import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { useCreateTextResourcesForOrgMutation } from './useCreateTextResourcesForOrgMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { org } from '@studio/testing/testids';

const languageMock: string = 'nb';

describe('useCreateTextResourcesForOrgMutation', () => {
  it('Calls createTextResourcesForOrg with correct arguments and payload', async () => {
    const result = renderHookWithProviders()(() =>
      useCreateTextResourcesForOrgMutation(org, languageMock),
    ).renderHookResult.result;

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.createTextResourcesForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.createTextResourcesForOrg).toHaveBeenCalledWith(org, languageMock);
  });

  it('Invalidates query key', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders(
      {},
      client,
    )(() => useCreateTextResourcesForOrgMutation(org, languageMock)).renderHookResult.result;

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.TextResourcesForOrg],
    });
  });
});
