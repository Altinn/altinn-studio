import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { useOrgCodeListsQuery } from 'app-shared/hooks/queries/useOrgCodeListsQuery';

describe('useOrgCodeListsQuery', () => {
  it('calls getCodeListsForOrg with the correct parameters', () => {
    render();
    expect(queriesMock.getCodeListsForOrg).toHaveBeenCalledWith(org);
  });
});

const render = async () => {
  const { result } = renderHookWithProviders(() => useOrgCodeListsQuery(org));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
