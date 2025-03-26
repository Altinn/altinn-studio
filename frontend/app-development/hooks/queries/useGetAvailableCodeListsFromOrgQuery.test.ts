import { waitFor } from '@testing-library/react';
import { useGetAvailableCodeListsFromOrgQuery } from './useGetAvailableCodeListsFromOrgQuery';
import { org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { listOfAvailableCodeListTitlesToImport } from 'app-shared/mocks/codeListTitlesMock';

describe('useGetAvailableCodeListsFromOrgQuery', () => {
  it('Calls getAvailableCodeListTitlesInOrg with correct arguments and returns the data', async () => {
    const getAvailableCodeListTitlesInOrg = jest
      .fn()
      .mockImplementation(() => Promise.resolve(listOfAvailableCodeListTitlesToImport));

    const result = renderHookWithProviders(() => useGetAvailableCodeListsFromOrgQuery(org), {
      queries: { getAvailableCodeListTitlesInOrg },
    }).result;

    await waitFor(() => result.current.isSuccess);
    expect(getAvailableCodeListTitlesInOrg).toHaveBeenCalledWith(org);
    expect(result.current.data).toEqual(listOfAvailableCodeListTitlesToImport);
  });
});
