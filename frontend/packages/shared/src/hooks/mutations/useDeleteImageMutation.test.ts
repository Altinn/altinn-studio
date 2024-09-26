import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useDeleteImageMutation } from './useDeleteImageMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

describe('useDeleteImageMutation', () => {
  it('Calls deleteImage with correct arguments and payload', async () => {
    const result = renderHookWithProviders()(() => useDeleteImageMutation(org, app))
      .renderHookResult.result;

    const fileName = 'fileName';
    result.current.mutate(fileName);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.deleteImage).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteImage).toHaveBeenCalledWith(org, app, fileName);
  });

  it('Invalidates imageFileNames when deleting an image', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useDeleteImageMutation(org, app))
      .renderHookResult.result;

    const fileName = 'fileName';
    result.current.mutate(fileName);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.ImageFileNames, org, app],
    });
  });
});
