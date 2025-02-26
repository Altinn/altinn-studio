import { useState } from 'react';
import { typedLocalStorage } from '@studio/pure-functions';
import type { RepoIncludingStarredData } from 'dashboard/utils/repoUtils/repoUtils';

type SortDirection = 'asc' | 'desc';

type SortPreference = {
  column: string;
  direction: SortDirection;
};

type UseLocalReposSortProps = {
  repos: RepoIncludingStarredData[] | undefined;
  storageKey: string;
  defaultSortKey?: string;
  defaultSortDirection?: SortDirection;
};

type UseLocalReposSortResult = {
  sortedRepos: RepoIncludingStarredData[];
  sortKey: string;
  sortDirection: SortDirection;
  handleSortClick: (columnKey: string) => void;
};

export const useLocalReposSort = ({
  repos,
  storageKey,
  defaultSortKey = 'name',
  defaultSortDirection = 'asc',
}: UseLocalReposSortProps): UseLocalReposSortResult => {
  const savedPreference = typedLocalStorage.getItem<SortPreference>(storageKey);
  const [sortKey, setSortKey] = useState<string>(savedPreference?.column || defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    savedPreference?.direction || defaultSortDirection,
  );

  const handleSortClick = (columnKey: string) => {
    let newDirection: SortDirection;
    let newSortKey: string;

    if (columnKey === sortKey) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      newSortKey = sortKey;
    } else {
      newDirection = 'asc';
      newSortKey = columnKey;
    }

    setSortKey(newSortKey);
    setSortDirection(newDirection);
    typedLocalStorage.setItem(storageKey, {
      column: newSortKey,
      direction: newDirection,
    });
  };

  const sortedRepos = repos
    ? [...repos].sort((a, b) => {
        let aValue: any = sortKey === 'updated' ? a.updated_at : a[sortKey as keyof typeof a];
        let bValue: any = sortKey === 'updated' ? b.updated_at : b[sortKey as keyof typeof b];

        if (sortKey === 'createdBy') {
          aValue = a.owner.full_name || a.owner.login;
          bValue = b.owner.full_name || b.owner.login;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (aValue instanceof Date || (typeof aValue === 'string' && !isNaN(Date.parse(aValue)))) {
          return sortDirection === 'asc'
            ? new Date(aValue).getTime() - new Date(bValue).getTime()
            : new Date(bValue).getTime() - new Date(aValue).getTime();
        }

        return 0;
      })
    : [];

  return {
    sortedRepos,
    sortKey,
    sortDirection,
    handleSortClick,
  };
};
