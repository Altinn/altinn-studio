import { useState } from 'react';
import { typedLocalStorage } from '@studio/pure-functions';
import type { RepoIncludingStarredData } from 'dashboard/utils/repoUtils/repoUtils';

export enum Direction {
  Asc = 'asc',
  Desc = 'desc',
}

type SortPreference = {
  sortKey: string;
  direction: Direction;
};

type UseLocalReposSortProps = {
  repos: RepoIncludingStarredData[] | undefined;
  storageKey?: string;
  defaultSortKey?: string;
  defaultSortDirection?: Direction;
};

type UseLocalReposSortResult = {
  sortedRepos: RepoIncludingStarredData[];
  sortKey: string;
  sortDirection: Direction;
  handleSortClick: (columnKey: string) => void;
};

type SortableKeys = 'name' | 'updated' | 'createdBy';

export const useLocalReposSort = ({
  repos,
  storageKey = 'dashboard-app-sort-order',
  defaultSortKey = 'name',
  defaultSortDirection = Direction.Asc,
}: UseLocalReposSortProps): UseLocalReposSortResult => {
  const savedPreference = typedLocalStorage.getItem<SortPreference>(storageKey);
  const [sortKey, setSortKey] = useState<string>(savedPreference?.sortKey || defaultSortKey);
  const [sortDirection, setSortDirection] = useState<Direction>(
    savedPreference?.direction || defaultSortDirection,
  );

  const handleSortClick = (columnKey: string) => {
    if (columnKey === sortKey) {
      const newDirection = sortDirection === Direction.Asc ? Direction.Desc : Direction.Asc;
      setSortDirection(newDirection);
      typedLocalStorage.setItem(storageKey, {
        sortKey,
        direction: newDirection,
      });
    } else {
      setSortKey(columnKey);
      setSortDirection(Direction.Asc);
      typedLocalStorage.setItem(storageKey, {
        sortKey: columnKey,
        direction: Direction.Asc,
      });
    }
  };

  const getSortValue = (repo: RepoIncludingStarredData, key: SortableKeys): string => {
    switch (key) {
      case 'updated':
        return repo.updated_at;
      case 'createdBy':
        return repo.owner.full_name || repo.owner.login;
      case 'name':
        return repo.name;
      default:
        return '';
    }
  };

  const sortedRepos = repos
    ? [...repos].sort((a, b) => {
        const aValue = getSortValue(a, sortKey as SortableKeys);
        const bValue = getSortValue(b, sortKey as SortableKeys);

        if (sortKey === 'updated' && !isNaN(Date.parse(aValue)) && !isNaN(Date.parse(bValue))) {
          const aDate = new Date(aValue).getTime();
          const bDate = new Date(bValue).getTime();
          return sortDirection === Direction.Asc ? aDate - bDate : bDate - aDate;
        }

        return sortDirection === Direction.Asc
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      })
    : [];

  return {
    sortedRepos,
    sortKey,
    sortDirection,
    handleSortClick,
  };
};
