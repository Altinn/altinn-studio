import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { repository } from 'app-shared/mocks/mocks';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';
import type { SearchRepositoryResponse } from 'app-shared/types/api/SearchRepositoryResponse';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { OrgReposList } from './OrgReposList';

const orgName = 'testorg';
const orgId = 2;
const user: User = { ...repository.owner, id: 1, login: 'testuser' };
const organizations: Organization[] = [{ id: orgId, username: orgName, avatar_url: '' }];

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: () => ({ selectedContext: orgName }),
}));

describe('OrgReposList', () => {
  it('should ask the search to leave out the shared repositories of the organization', async () => {
    const searchRepos = vi.fn().mockResolvedValue(searchResponse({ totalCount: 1, totalPages: 1 }));
    renderOrgReposList(searchRepos);

    await waitFor(() =>
      expect(searchRepos).toHaveBeenCalledWith(
        expect.objectContaining({ uid: orgId, excludeNonAppRepos: true }),
      ),
    );
  });

  it('should show every page of the search, also when pages hold fewer apps than the page size', async () => {
    const searchRepos = vi
      .fn()
      .mockResolvedValue(searchResponse({ totalCount: 10, totalPages: 3 }));
    renderOrgReposList(searchRepos);

    expect(await screen.findByRole('button', { name: pageButtonName(3) })).toBeInTheDocument();
  });
});

const searchResponse = ({
  totalCount,
  totalPages,
}: Pick<SearchRepositoryResponse, 'totalCount' | 'totalPages'>): SearchRepositoryResponse => ({
  data: [{ ...repository, name: 'app', full_name: `${orgName}/app` }],
  ok: true,
  totalCount,
  totalPages,
});

const pageButtonName = (pageNumber: number): string => `${textMock('general.page')} ${pageNumber}`;

function renderOrgReposList(
  searchRepos: (...args: unknown[]) => Promise<SearchRepositoryResponse>,
) {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.CurrentUser], user);
  queryClient.setQueryData([QueryKey.Organizations], organizations);
  renderWithProviders(<OrgReposList user={user} organizations={organizations} />, {
    queries: { searchRepos, getStarredRepos: vi.fn().mockResolvedValue([]) },
    queryClient,
  });
}
