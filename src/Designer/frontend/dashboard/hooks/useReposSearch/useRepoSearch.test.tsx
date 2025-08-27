import { Direction, useReposSearch } from './useRepoSearch';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../testing/mocks';
import { repository } from 'app-shared/mocks/mocks';
import type { SearchRepoFilterParams } from 'app-shared/types/api';

const reposSortedByName = [
  { ...repository, name: 'A-repo', updated_at: '1990-01-01' },
  { ...repository, name: 'B-repo', updated_at: '1970-01-01' },
  { ...repository, name: 'C-repo', updated_at: '1980-01-01' },
];
const reposSortedByNameReversed = reposSortedByName.reverse();

const reposSortedByUpdatedAt = [
  { ...repository, name: 'B-repo', updated_at: '1970-01-01' },
  { ...repository, name: 'C-repo', updated_at: '1980-01-01' },
  { ...repository, name: 'A-repo', updated_at: '1990-01-01' },
];
const reposSortedByUpdatedAtReversed = reposSortedByUpdatedAt.reverse();

const getSearchDataMock = ({ order, sortby }: Partial<SearchRepoFilterParams>) => {
  switch (sortby) {
    case 'alpha':
      return order === Direction.Asc ? reposSortedByName : reposSortedByNameReversed;
    case 'updated':
      return order === Direction.Asc ? reposSortedByUpdatedAt : reposSortedByUpdatedAtReversed;
    default:
      return [];
  }
};

describe('useRepoSearch', () => {
  it('should switch back and forth between "asc" and "desc" when using onSortClick on the same column', async () => {
    const { result } = renderHookWithProviders(() => useReposSearch({}), {
      queries: {
        searchRepos: ({ order, sortby }: SearchRepoFilterParams) =>
          Promise.resolve({
            data: getSearchDataMock({ order, sortby }),
            ok: true,
            totalCount: 2,
            totalPages: 1,
          }),
      },
    });

    await waitFor(() => expect(result.current.searchResults.data).toEqual(reposSortedByName));

    await waitFor(() => result.current.onSortClick('name'));
    await waitFor(() =>
      expect(result.current.searchResults.data).toEqual(reposSortedByNameReversed),
    );

    await waitFor(() => result.current.onSortClick('name'));
    await waitFor(() => expect(result.current.searchResults.data).toEqual(reposSortedByName));
  });

  it('should always sort by ascending when selecting a different column', async () => {
    const { result } = renderHookWithProviders(() => useReposSearch({}), {
      queries: {
        searchRepos: ({ order, sortby }: SearchRepoFilterParams) =>
          Promise.resolve({
            data: getSearchDataMock({ order, sortby }),
            ok: true,
            totalCount: 2,
            totalPages: 1,
          }),
      },
    });

    await waitFor(() => expect(result.current.searchResults.data).toEqual(reposSortedByName));

    await waitFor(() => result.current.onSortClick('updated_at'));
    await waitFor(() => expect(result.current.searchResults.data).toEqual(reposSortedByUpdatedAt));

    await waitFor(() => result.current.onSortClick('name'));
    await waitFor(() => expect(result.current.searchResults.data).toEqual(reposSortedByName));
  });
});
