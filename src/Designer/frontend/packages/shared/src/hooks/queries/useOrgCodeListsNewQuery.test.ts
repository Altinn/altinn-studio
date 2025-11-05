import { waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useOrgCodeListsNewQuery } from 'app-shared/hooks/queries/useOrgCodeListsNewQuery';
import type { CodeListsNewResponse } from 'app-shared/types/api/CodeListsNewResponse';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const orgName = 'test-org';
const codeListsNewResponse: CodeListsNewResponse = {
  codeListWrappers: [],
  commitSha: '38c90d8e9dbe63e69ce071532efc01bc0e3ed81a',
};
const getOrgCodeListsNew = jest.fn().mockResolvedValue(codeListsNewResponse);

describe('useOrgCodeListsNewQuery', () => {
  afterEach(getOrgCodeListsNew.mockClear);

  it('Calls getOrgCodeListsNew with the correct parameters', () => {
    renderUseOrgCodeListsNewQuery();
    expect(getOrgCodeListsNew).toHaveBeenCalledWith(orgName);
  });

  it('Populates the cache with correct keys', async () => {
    const client = createQueryClientMock();
    const { result } = renderUseOrgCodeListsNewQuery(client);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([QueryKey.OrgCodeListsNew, orgName])).toEqual(codeListsNewResponse);
  });

  it('Returns the correct data from the cache', () => {
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.OrgCodeListsNew, orgName], codeListsNewResponse);
    const { result } = renderUseOrgCodeListsNewQuery(client);
    expect(result.current.data).toEqual(codeListsNewResponse);
  });
});

function renderUseOrgCodeListsNewQuery(
  queryClient: QueryClient = createQueryClientMock(),
): RenderHookResult<UseQueryResult<CodeListsNewResponse>, void> {
  return renderHookWithProviders(() => useOrgCodeListsNewQuery(orgName), {
    queries: { getOrgCodeListsNew },
    queryClient,
  });
}
