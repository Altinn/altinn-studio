import { repository } from 'app-shared/mocks/mocks';
import type { RepoIncludingStarredData } from 'dashboard/utils/repoUtils/repoUtils';

export const mockRepos: RepoIncludingStarredData[] = [
  {
    ...repository,
    id: 1,
    name: 'repo-b',
    updated_at: '2024-01-01',
    owner: {
      ...repository.owner,
      full_name: 'Test Testesen-To',
      login: 'user2',
      id: 2,
    },
  },
  {
    ...repository,
    id: 2,
    name: 'repo-a',
    updated_at: '2025-01-01',
    owner: {
      ...repository.owner,
      full_name: 'Test Testesen-En',
      login: 'user1',
      id: 1,
    },
  },
];

export const mockReposWithInvalidDate: RepoIncludingStarredData[] = [
  {
    ...repository,
    id: 1,
    name: 'repo-b',
    updated_at: 'invalid-date',
    owner: {
      ...repository.owner,
      full_name: 'Test Testesen-To',
      login: 'user2',
      id: 2,
    },
  },
  {
    ...repository,
    id: 2,
    name: 'repo-a',
    updated_at: '2025-01-01',
    owner: {
      ...repository.owner,
      full_name: 'Test Testesen-En',
      login: 'user1',
      id: 1,
    },
  },
];

export const mockReposWithoutFullName: RepoIncludingStarredData[] = [
  {
    ...repository,
    id: 1,
    name: 'repo-b',
    updated_at: '2024-01-01',
    owner: {
      ...repository.owner,
      full_name: '',
      login: 'userb',
      id: 2,
    },
  },
  {
    ...repository,
    id: 2,
    name: 'repo-a',
    updated_at: '2025-01-01',
    owner: {
      ...repository.owner,
      full_name: '',
      login: 'usera',
      id: 1,
    },
  },
];
