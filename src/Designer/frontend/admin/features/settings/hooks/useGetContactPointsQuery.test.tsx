import { renderHook, waitFor } from '@testing-library/react';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { useGetContactPointsQuery } from './useGetContactPointsQuery';

const testOrg = 'ttd';

const renderUseGetContactPointsQuery = () =>
  renderHook(() => useGetContactPointsQuery(testOrg), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        {children}
      </ServicesContextProvider>
    ),
  });

describe('useGetContactPointsQuery', () => {
  it('calls getContactPoints with the correct org', async () => {
    const { result } = renderUseGetContactPointsQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.getContactPoints).toHaveBeenCalledWith(testOrg);
  });
});
