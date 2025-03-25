import { waitFor } from '@testing-library/react';
import { useGetAvailableOptionListsFromOrgQuery } from './useGetAvailableOptionListsFromOrgQuery';
import { org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { listOfAvailableOptionListTitlesToImport } from 'app-shared/mocks/optionListTitlesMock';

describe('useGetAvailableOptionListsFromOrgQuery', () => {
  it('Calls getAvailableOptionListTitlesInOrg with correct arguments and returns the data', async () => {
    const getAvailableOptionListTitlesInOrg = jest
      .fn()
      .mockImplementation(() => Promise.resolve(listOfAvailableOptionListTitlesToImport));

    const result = renderHookWithProviders(() => useGetAvailableOptionListsFromOrgQuery(org), {
      queries: { getAvailableOptionListTitlesInOrg },
    }).result;

    await waitFor(() => result.current.isSuccess);
    expect(getAvailableOptionListTitlesInOrg).toHaveBeenCalledWith(org);
    expect(result.current.data).toEqual(listOfAvailableOptionListTitlesToImport);
  });
});
