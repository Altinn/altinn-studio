import { waitFor } from '@testing-library/react';
import { useGetAvailableCodeListsFromOrgQuery } from './useGetAvailableCodeListsFromOrgQuery';
import { org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { LibraryResourceType } from 'app-shared/enums/LibraryResourceType';

const title1: string = 'title1';
const title2: string = 'title2';

const listOfAvailableCodeListTitlesToImport: string[] = [title1, title2];

describe('useGetAvailableCodeListsFromOrgQuery', () => {
  it('Calls getAvailableResourcesFromOrg with correct arguments and returns the data', async () => {
    const getAvailableResourcesFromOrg = jest
      .fn()
      .mockImplementation(() => Promise.resolve(listOfAvailableCodeListTitlesToImport));

    const result = renderHookWithProviders(
      () => useGetAvailableCodeListsFromOrgQuery(org, LibraryResourceType.CodeList),
      {
        queries: { getAvailableResourcesFromOrg },
      },
    ).result;

    await waitFor(() => result.current.isSuccess);
    expect(getAvailableResourcesFromOrg).toHaveBeenCalledWith(org, LibraryResourceType.CodeList);
    expect(result.current.data).toEqual(listOfAvailableCodeListTitlesToImport);
  });
});
