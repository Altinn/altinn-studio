import { renderHook, waitFor } from '@testing-library/react';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { useGetOrgReposQuery } from './useGetOrgReposQuery';

const testOrg = 'ttd';

const renderUseGetOrgReposQuery = () =>
  renderHook(() => useGetOrgReposQuery(testOrg), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        {children}
      </ServicesContextProvider>
    ),
  });

describe('useGetOrgReposQuery', () => {
  it('calls getOrgRepos with the correct org', async () => {
    const { result } = renderUseGetOrgReposQuery();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queriesMock.getOrgRepos).toHaveBeenCalledWith(testOrg);
  });
});
