import { Repository } from 'app-shared/types/Repository';

export const mockRepository1: Repository = {
  clone_url: '',
  created_at: '2023-09-20T10:40:00Z',
  default_branch: '',
  description: '',
  empty: false,
  fork: false,
  forks_count: 0,
  full_name: '',
  html_url: '',
  id: 123,
  is_cloned_to_local: true,
  mirror: false,
  name: 'CoolService',
  open_issues_count: 0,
  owner: {
    avatar_url: '',
    email: '',
    full_name: 'Mons Monsen',
    id: 234,
    login: 'Mons',
    UserType: 2,
  },
  permissions: {
    admin: true,
    pull: true,
    push: true,
  },
  private: false,
  repositoryCreatedStatus: 0,
  size: 0,
  ssh_url: '',
  stars_count: 1337,
  updated_at: '',
  watchers_count: 0,
  website: '',
};

export const mockRepository2: Repository = {
  ...mockRepository1,
  owner: {
    ...mockRepository1.owner,
    full_name: '',
  },
};
