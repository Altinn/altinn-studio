import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { useGlobalValidationOnNavigationQuery } from './useGlobalValidationOnNavigationQuery';
import { app, org } from '@studio/testing/testids';

describe('useGlobalValidationOnNavigationQuery', () => {
  it('should call getValidationOnNavigationLayoutSets with the correct parameters', () => {
    render();
    expect(queriesMock.getValidationOnNavigationLayoutSets).toHaveBeenCalledWith(org, app);
  });

  it('should return the correct data', async () => {
    const { current } = await render();
    expect(current.data).toEqual({ show: [], page: '' });
  });
});

const render = async () => {
  const { result } = renderHookWithProviders(() => useGlobalValidationOnNavigationQuery(org, app));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
