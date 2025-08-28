import { waitFor } from '@testing-library/react';
import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { org } from '@studio/testing/testids';
import { useOrgCodeListsQuery } from '../../hooks/queries/useOrgCodeListsQuery';

describe('useOrgCodeListsQuery', () => {
  it('calls getOrgCodeLists with the correct parameters', () => {
    render();
    expect(queriesMock.getOrgCodeLists).toHaveBeenCalledWith(org);
  });
});

const render = async () => {
  const { result } = renderHookWithProviders(() => useOrgCodeListsQuery(org));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
