import { org, app } from '@studio/testing/testids';
import { renderHookWithProviders } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useDeleteValidationOnNavigationLayoutSets } from './useDeleteValidationOnNavigationLayoutSets';

describe('useDeleteValidationOnNavigationLayoutSets', () => {
  it('Calls deleteValidationOnNavigationLayoutSets with correct arguments', async () => {
    const { result } = renderDeleteValidationOnNavigationLayoutSets();

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.deleteValidationOnNavigationLayoutSets).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteValidationOnNavigationLayoutSets).toHaveBeenCalledWith(org, app);
  });
});

const renderDeleteValidationOnNavigationLayoutSets = () => {
  return renderHookWithProviders(() => useDeleteValidationOnNavigationLayoutSets(org, app));
};
