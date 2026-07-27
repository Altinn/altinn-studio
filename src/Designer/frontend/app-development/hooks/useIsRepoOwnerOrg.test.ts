import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { repository } from 'app-shared/mocks/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { Org } from 'app-shared/types/OrgList';
import type { Repository } from 'app-shared/types/Repository';
import { org, app } from '@studio/testing/testids';
import { useIsRepoOwnerOrg } from './useIsRepoOwnerOrg';

describe('useIsRepoOwnerOrg', () => {
  it('returns true when the repository owner is in the organisation list', () => {
    const { result } = renderIsRepoOwnerOrg(org);
    expect(result.current).toBe(true);
  });

  it('returns false when the repository owner is not in the organisation list', () => {
    const { result } = renderIsRepoOwnerOrg('private-user');
    expect(result.current).toBe(false);
  });
});

const renderIsRepoOwnerOrg = (repositoryOwner: string) => {
  const repositoryWithOwner: Repository = {
    ...repository,
    owner: { ...repository.owner, login: repositoryOwner },
  };

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OrgList], { [org]: {} as Org });
  queryClient.setQueryData([QueryKey.RepoMetadata, org, app], repositoryWithOwner);

  return renderHookWithProviders(() => useIsRepoOwnerOrg(), {
    queryClient,
    appRouteParams: { org, app },
  });
};
