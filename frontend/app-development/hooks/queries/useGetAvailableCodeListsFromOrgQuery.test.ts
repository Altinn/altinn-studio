import { waitFor } from '@testing-library/react';
import { useGetAvailableCodeListsFromOrgQuery } from './useGetAvailableCodeListsFromOrgQuery';
import { org, app } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { LibraryContentType } from 'app-shared/enums/LibraryContentType';
import { useOrgListQuery } from './useOrgListQuery';

const title1: string = 'title1';
const title2: string = 'title2';

const listOfAvailableCodeListTitlesToImport: string[] = [title1, title2];

/*
describe('useGetAvailableCodeListsFromOrgQuery', () => {
  it('Calls getAvailbleResourcesFromOrg with correct arguments and returns the data', async () => {
    const getAvailbleResourcesFromOrg = jest
      .fn()
      .mockImplementation(() => Promise.resolve(listOfAvailableCodeListTitlesToImport));

    const getOrgList = jest.fn().mockImplementation(() => {
      return Promise.resolve({ orgs: { [org]: {} } });
    });

    const result = renderHookWithProviders(
      () => useGetAvailableCodeListsFromOrgQuery(org, LibraryContentType.CodeList),
      {
        queries: { getAvailbleResourcesFromOrg, getOrgList },
      },
    ).result;

    await waitFor(() => result.current.isSuccess);
    expect(getAvailbleResourcesFromOrg).toHaveBeenCalledWith(org, LibraryContentType.CodeList);
    expect(result.current.data).toEqual(listOfAvailableCodeListTitlesToImport);
  });
});
*/

jest.mock('./useOrgListQuery', () => ({
  useOrgListQuery: jest.fn(),
}));

describe('useGetAvailableCodeListsFromOrgQuery', () => {
  it('Calls getAvailbleResourcesFromOrg with correct arguments and returns the data', async () => {
    (useOrgListQuery as jest.Mock).mockImplementation(() =>
      Promise.resolve({ orgs: { [org]: {} } }),
    );

    const getAvailbleResourcesFromOrg = jest
      .fn()
      .mockImplementation(() => Promise.resolve(listOfAvailableCodeListTitlesToImport));

    const result = renderHookWithProviders(
      () => useGetAvailableCodeListsFromOrgQuery(org, LibraryContentType.CodeList),
      {
        queries: { getAvailbleResourcesFromOrg },
      },
    ).result;

    await waitFor(() => result.current.isSuccess);
    expect(getAvailbleResourcesFromOrg).toHaveBeenCalledWith(org, LibraryContentType.CodeList);
    expect(result.current.data).toEqual(listOfAvailableCodeListTitlesToImport);
  });
});
