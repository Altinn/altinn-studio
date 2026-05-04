import { waitFor } from '@testing-library/react';
import { useGetAvailableOrgResourcesQuery } from './useGetAvailableOrgResourcesQuery';
import { org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { LibraryContentType } from 'app-shared/enums/LibraryContentType';
import type { ExternalResource } from 'app-shared/types/ExternalResource';

const externalCodeList1: ExternalResource = {
  source: 'org.ttd',
  type: LibraryContentType.CodeList,
  id: 'title1',
};

const externalCodeList2: ExternalResource = {
  source: 'org.ttd',
  type: LibraryContentType.CodeList,
  id: 'title2',
};

const availableCodeListsToImport: ExternalResource[] = [externalCodeList1, externalCodeList2];

describe('useGetAvailableOrgResourcesQuery', () => {
  it('Calls getAvailableResourcesFromOrg without type parameter and returns the data', async () => {
    const getAvailableResourcesFromOrg = jest
      .fn()
      .mockImplementation(() => Promise.resolve(availableCodeListsToImport));

    const result = renderHookWithProviders(() => useGetAvailableOrgResourcesQuery(org), {
      queries: { getAvailableResourcesFromOrg },
    }).result;

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.data).toEqual(availableCodeListsToImport));
    expect(getAvailableResourcesFromOrg).toHaveBeenCalledWith(org, undefined);
  });

  it('Calls getAvailableResourcesFromOrg with type parameter and returns the data', async () => {
    const getAvailableResourcesFromOrg = jest
      .fn()
      .mockImplementation(() => Promise.resolve(availableCodeListsToImport));

    const result = renderHookWithProviders(
      () => useGetAvailableOrgResourcesQuery(org, LibraryContentType.CodeList),
      {
        queries: { getAvailableResourcesFromOrg },
      },
    ).result;

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.data).toEqual(availableCodeListsToImport));
    expect(getAvailableResourcesFromOrg).toHaveBeenCalledWith(org, LibraryContentType.CodeList);
  });
});
