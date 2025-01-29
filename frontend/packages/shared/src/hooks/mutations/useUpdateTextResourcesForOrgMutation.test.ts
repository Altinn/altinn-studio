import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { useUpdateTextResourcesForOrgMutation } from './useUpdateTextResourcesForOrgMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { org } from '@studio/testing/testids';
import { type ITextResource } from 'app-shared/types/global';
import { label1TextResource, label2TextResource } from 'app-shared/mocks/textResourcesMock';

const languageMock: string = 'nb';
const textResourcesMock: ITextResource[] = [label1TextResource, label2TextResource];

describe('useUpdateTextResourcesForOrgMutation', () => {
  it('Calls updateTextResourcesForOrg with correct arguments and payload', async () => {
    const result = renderHookWithProviders()(() =>
      useUpdateTextResourcesForOrgMutation(org, languageMock),
    ).renderHookResult.result;

    result.current.mutate(textResourcesMock);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.updateTextResourcesForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateTextResourcesForOrg).toHaveBeenCalledWith(
      org,
      languageMock,
      textResourcesMock,
    );
  });

  it('Invalidates query key', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders(
      {},
      client,
    )(() => useUpdateTextResourcesForOrgMutation(org, languageMock)).renderHookResult.result;

    result.current.mutate(textResourcesMock);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.TextResourcesForOrg],
    });
  });
});
