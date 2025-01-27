import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { useCreateOrgLevelCodeListMutation } from './useCreateOrgLevelCodeListMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';

const newCodeList: OptionListsResponse = [
  {
    title: 'title',
    data: [
      { label: 'label1', value: 'value1' },
      { label: 'label2', value: 'value2' },
    ],
    hasError: false,
  },
];

describe('useCreateOrgLevelCodeListMutation', () => {
  it('Calls createOrgLevelCodeList with correct arguments and payload', async () => {
    const result = renderHookWithProviders()(() => useCreateOrgLevelCodeListMutation())
      .renderHookResult.result;

    result.current.mutate(newCodeList);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.createOrgLevelCodeList).toHaveBeenCalledTimes(1);
    expect(queriesMock.createOrgLevelCodeList).toHaveBeenCalledWith(newCodeList);
  });

  it('Invalidates query key', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useCreateOrgLevelCodeListMutation())
      .renderHookResult.result;

    result.current.mutate(newCodeList);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.OrgLevelCodeLists],
    });
  });
});
