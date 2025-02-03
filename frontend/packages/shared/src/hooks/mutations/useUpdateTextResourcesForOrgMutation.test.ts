import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useUpdateTextResourcesForOrgMutation } from './useUpdateTextResourcesForOrgMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import { org } from '@studio/testing/testids';
import { type ITextResource } from '../../types/global';
import { label1TextResource, label2TextResource } from '../../mocks/textResourcesMock';

const languageMock: string = 'nb';
const textResourcesMock: ITextResource[] = [label1TextResource, label2TextResource];

describe('useUpdateTextResourcesForOrgMutation', () => {
  it('Calls updateTextResourcesForOrg with correct arguments and payload', async () => {
    const result = renderHookWithProviders(() =>
      useUpdateTextResourcesForOrgMutation(org, languageMock),
    ).result;

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
      () => useUpdateTextResourcesForOrgMutation(org, languageMock),
      { queryClient: client },
    ).result;

    result.current.mutate(textResourcesMock);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.TextResourcesForOrg],
    });
  });
});
