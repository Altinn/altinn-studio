import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { repository } from 'app-shared/mocks/mocks';
import type { Org } from 'app-shared/types/OrgList';
import type { Repository } from 'app-shared/types/Repository';
import { org } from '@studio/testing/testids';
import { useIsRepoOwnerOrg } from './useIsRepoOwnerOrg';

describe('useIsRepoOwnerOrg', () => {
  it('returns true when the repository owner is in the organisation list', async () => {
    const { result } = renderIsRepoOwnerOrg(org);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false when the repository owner is not in the organisation list', async () => {
    const { result } = renderIsRepoOwnerOrg('private-user');
    await waitFor(() => expect(result.current).toBe(false));
  });
});

const renderIsRepoOwnerOrg = (repositoryOwner: string) => {
  const repositoryWithOwner: Repository = {
    ...repository,
    owner: { ...repository.owner, login: repositoryOwner },
  };

  return renderHookWithProviders(() => useIsRepoOwnerOrg(), {
    queries: {
      getOrgList: () => Promise.resolve({ orgs: { [org]: {} as Org } }),
      getRepoMetadata: () => Promise.resolve(repositoryWithOwner),
    },
  });
};
