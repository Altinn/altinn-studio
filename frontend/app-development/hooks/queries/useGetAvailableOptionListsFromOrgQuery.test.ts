import { waitFor } from '@testing-library/react';
import { useGetAvailableOptionListsFromOrgQuery } from './useGetAvailableOptionListsFromOrgQuery';
import { org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { optionListDataListMock } from 'app-shared/mocks/optionListDataListMock';

describe('useGetAvailableOptionListsFromOrgQuery', () => {
  it('Calls getAvailableOptionListDataListsInOrg with correct arguments and returns the data', async () => {
    const getAvailableOptionListDataListsInOrg = jest
      .fn()
      .mockImplementation(() => Promise.resolve(optionListDataListMock));

    const result = renderHookWithProviders(() => useGetAvailableOptionListsFromOrgQuery(org), {
      queries: { getAvailableOptionListDataListsInOrg },
    }).result;

    await waitFor(() => result.current.isPending);
    expect(getAvailableOptionListDataListsInOrg).toHaveBeenCalledWith(org);
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(optionListDataListMock);
  });
});
