import { org, app } from '@studio/testing/testids';
import { renderHookWithProviders } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useDeleteGlobalValidationOnNavigation } from './useDeleteGlobalValidationOnNavigation';

describe('useDeleteGlobalValidationOnNavigation', () => {
  it('Calls deleteValidationOnNavigationLayoutSets with correct arguments', async () => {
    const { result } = deleteGlobalValidationOnNavigation();

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.deleteValidationOnNavigationLayoutSets).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteValidationOnNavigationLayoutSets).toHaveBeenCalledWith(org, app);
  });
});

const deleteGlobalValidationOnNavigation = () => {
  return renderHookWithProviders(() => useDeleteGlobalValidationOnNavigation(org, app));
};
