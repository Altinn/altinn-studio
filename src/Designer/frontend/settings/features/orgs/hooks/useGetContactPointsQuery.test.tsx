import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../../testing/mocks';
import { useGetContactPointsQuery } from './useGetContactPointsQuery';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const testOrg = 'ttd';

const renderUseGetContactPointsQuery = () =>
  renderHookWithProviders(() => useGetContactPointsQuery(testOrg));

describe('useGetContactPointsQuery', () => {
  it('calls getContactPoints with the correct org', async () => {
    const { result } = renderUseGetContactPointsQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.getContactPoints).toHaveBeenCalledWith(testOrg);
  });
});
