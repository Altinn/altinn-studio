import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { waitFor } from '@testing-library/react';
import { useOrgLevelCodeListsQuery } from './useOrgLevelCodeListsQuery';

describe('useOrgLevelCodeListsQuery', () => {
  it('calls getOrgLevelCodeLists with the correct parameters', () => {
    render();
    expect(queriesMock.getOrgLevelCodeLists).toHaveBeenCalledWith();
    expect(queriesMock.getOrgLevelCodeLists).toHaveBeenCalledTimes(1);
  });
});

const render = async () => {
  const { result } = renderHookWithProviders(() => useOrgLevelCodeListsQuery());
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
