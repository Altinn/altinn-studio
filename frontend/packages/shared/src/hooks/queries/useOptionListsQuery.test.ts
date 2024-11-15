import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { useOptionListsQuery } from './useOptionListsQuery';
import { app, org } from '@studio/testing/testids';

describe('useOptionListsQuery', () => {
  it('calls getOptionLists with the correct parameters', () => {
    render();
    expect(queriesMock.getOptionLists).toHaveBeenCalledWith(org, app);
  });
});

const render = async () => {
  const { result } = renderHookWithProviders(() => useOptionListsQuery(org, app));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
