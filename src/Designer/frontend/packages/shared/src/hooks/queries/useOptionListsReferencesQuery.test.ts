import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { waitFor } from '@testing-library/react';
import { useOptionListsReferencesQuery } from './useOptionListsReferencesQuery';

describe('useOptionListsReferencesQuery', () => {
  it('calls getOptionListsReferences with the correct parameters', () => {
    render();
    expect(queriesMock.getOptionListsReferences).toHaveBeenCalledWith(org, app);
  });
});

const render = async () => {
  const { result } = renderHookWithProviders(() => useOptionListsReferencesQuery(org, app));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
